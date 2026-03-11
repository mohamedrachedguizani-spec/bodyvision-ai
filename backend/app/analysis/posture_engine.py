"""
Analyse posturale multi-vues avec MediaPipe Pose.

Améliorations par rapport à l'ancienne version :
  1. Scoring par moyenne pondérée (et non par multiplication en cascade)
  2. Calculs angulaires biomécaniques (atan2) pour chaque vue
  3. Détection d'anomalies avec seuils documentés
  4. Séparation claire vue frontale / latérale / dorsale
  5. Pas de bare except — erreurs journalisées proprement
"""

import math
from typing import Dict, Any, List, Tuple, Optional

import numpy as np

# Import lazy — évite le crash au démarrage si libGL.so.1 est absent
try:
    import cv2
    import mediapipe as mp
    _CV2_MP_AVAILABLE = True
except (ImportError, OSError) as _cv2_err:
    print(f"⚠️  cv2/MediaPipe non disponible : {_cv2_err}")
    print("⚠️  L'analyse posturale sera désactivée.")
    cv2 = None  # type: ignore
    mp = None   # type: ignore
    _CV2_MP_AVAILABLE = False

from app.analysis.constants import (
    POSTURE_THRESHOLDS,
    FRONT_VIEW_WEIGHTS,
    SIDE_VIEW_WEIGHTS,
    BACK_VIEW_WEIGHTS,
    VIEW_WEIGHTS,
    get_posture_grade,
)


class PostureAnalysisEngine:
    """Moteur d'analyse posturale multi-vues."""

    def __init__(self):
        if not _CV2_MP_AVAILABLE:
            raise RuntimeError("cv2/MediaPipe non disponible (libGL.so.1 manquant)")
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=2,
            enable_segmentation=True,
            min_detection_confidence=0.5,
        )

    # ══════════════════════════════════════════════════════════
    # API PUBLIQUE
    # ══════════════════════════════════════════════════════════

    def analyze(self, image_path: str, view_type: str = "front") -> Dict[str, Any]:
        """
        Analyse posturale complète d'une image.
        Retourne score, grade, problèmes détectés, recommandations.
        """
        image = cv2.imread(image_path)
        if image is None:
            return self._default_analysis(view_type)

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)

        if not results.pose_landmarks:
            return self._default_analysis(view_type)

        landmarks = results.pose_landmarks.landmark
        shape = image.shape

        # 1. Score postural détaillé
        score, details = self._compute_posture_score(landmarks, shape, view_type)

        # 2. Détection de problèmes spécifiques
        issues = self._detect_issues(landmarks, view_type)

        # 3. Évaluations textuelles
        assessment = self._build_assessment(landmarks, view_type)

        # 4. Type de posture dominant
        posture_type = self._determine_posture_type(landmarks, view_type)

        return {
            "postural_assessment": {
                **assessment,
                "detailed_analysis": details,
                "view_type": view_type,
            },
            "posture_score": score,
            "posture_grade": get_posture_grade(score),
            "detected_issues": issues,
            "posture_type": posture_type,
            "improvement_recommendations": [],  # rempli par RecommendationEngine
            "landmark_analysis": details,
            "view_specific_insights": self._get_insights(landmarks, view_type),
        }

    def compute_comprehensive_score(
        self, per_view: Dict[str, Dict]
    ) -> Optional[Dict[str, Any]]:
        """
        Fusionne les scores posturaux de plusieurs vues
        en un score global pondéré.
        """
        if not per_view:
            return None

        total_score = 0.0
        total_weight = 0.0
        view_data: Dict[str, Any] = {}
        all_issues: List[Dict] = []

        available = [v for v in VIEW_WEIGHTS if v in per_view]
        n_available = len(available)

        for vtype, analysis in per_view.items():
            if vtype not in VIEW_WEIGHTS or not isinstance(analysis, dict):
                continue

            raw_score = analysis.get("posture_score", 0)
            w = VIEW_WEIGHTS[vtype] * (3 / n_available)  # redistribution si < 3 vues

            total_score += raw_score * w
            total_weight += w

            view_data[vtype] = {
                "score": raw_score,
                "grade": analysis.get("posture_grade", "N/A"),
                "weight": round(w, 3),
                "details": analysis.get("landmark_analysis", {}),
                "issues": analysis.get("detected_issues", []),
            }

            for issue in analysis.get("detected_issues", []):
                if isinstance(issue, dict):
                    enriched = {**issue, "detected_in_view": vtype}
                    all_issues.append(enriched)

        comp_score = round(total_score / total_weight, 1) if total_weight else 0

        # Asymétrie globale
        asym_scores = []
        for vd in view_data.values():
            a = vd["details"].get("asymmetry_score")
            if a is not None:
                asym_scores.append(a)
        global_asymmetry = round(np.mean(asym_scores), 1) if asym_scores else 0

        # Confiance
        confidence = self._confidence_label(n_available, list(per_view.keys()))

        return {
            "comprehensive_posture_score": comp_score,
            "comprehensive_grade": get_posture_grade(comp_score),
            "global_asymmetry_score": global_asymmetry,
            "view_contributions": view_data,
            "all_detected_issues": all_issues,
            "analysis_confidence": confidence,
            "available_views": list(per_view.keys()),
            "weights_used": {
                k: round(VIEW_WEIGHTS[k], 2)
                for k in VIEW_WEIGHTS
                if k in per_view
            },
        }

    # ══════════════════════════════════════════════════════════
    # SCORING — MOYENNE PONDÉRÉE (corrige l'ancien calcul en cascade)
    # ══════════════════════════════════════════════════════════

    def _compute_posture_score(
        self, landmarks, shape, view_type: str
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calcule un score postural par moyenne pondérée des composantes.
        Chaque composante est notée 0-100 puis le score global est :
            score = Σ (weight_i × score_i) / Σ weight_i
        """
        h, w = shape[:2]
        details: Dict[str, Any] = {"view_type": view_type, "angles": {}}

        try:
            if view_type == "front":
                components, details = self._score_front(landmarks, h, w, details)
                weights = FRONT_VIEW_WEIGHTS
            elif view_type == "side":
                components, details = self._score_side(landmarks, h, w, details)
                weights = SIDE_VIEW_WEIGHTS
            elif view_type == "back":
                components, details = self._score_back(landmarks, h, w, details)
                weights = BACK_VIEW_WEIGHTS
            else:
                components, details = self._score_front(landmarks, h, w, details)
                weights = FRONT_VIEW_WEIGHTS

            # Moyenne pondérée
            total_w = sum(weights[k] for k in components if k in weights)
            if total_w > 0:
                score = sum(
                    weights.get(k, 0) * v for k, v in components.items()
                ) / total_w
            else:
                score = 70.0

        except Exception as e:
            print(f"⚠️ Erreur score postural ({view_type}) : {e}")
            score = 70.0

        score = max(0, min(100, score))
        details["posture_grade"] = get_posture_grade(score)
        details["raw_score"] = round(score, 1)

        return round(score, 1), details

    # ─── Vue frontale ─────────────────────────────────────────

    def _score_front(self, lm, h, w, details) -> Tuple[Dict[str, float], Dict]:
        P = self.mp_pose.PoseLandmark
        components: Dict[str, float] = {}

        # 1. Symétrie épaules
        ls, rs = lm[P.LEFT_SHOULDER], lm[P.RIGHT_SHOULDER]
        dev = abs(ls.y - rs.y)
        components["shoulder_symmetry"] = _deviation_to_score(dev)
        details["shoulder_diff"] = f"{dev:.4f}"
        details["shoulder_score"] = components["shoulder_symmetry"]
        details["shoulder_alignment"] = _alignment_label(dev)
        details["angles"]["shoulder_angle"] = _line_angle(ls, rs)

        # 2. Alignement tête
        nose = lm[P.NOSE]
        mid_x = (ls.x + rs.x) / 2
        dev = abs(nose.x - mid_x)
        components["head_alignment"] = _deviation_to_score(dev)
        details["head_lean"] = f"{dev:.4f}"
        details["head_score"] = components["head_alignment"]
        details["head_alignment"] = _alignment_label(dev, "head")

        # 3. Symétrie hanches
        lh, rh = lm[P.LEFT_HIP], lm[P.RIGHT_HIP]
        dev = abs(lh.y - rh.y)
        components["hip_symmetry"] = _deviation_to_score(dev)
        details["hip_diff"] = f"{dev:.4f}"
        details["hip_score"] = components["hip_symmetry"]
        details["hip_alignment"] = _alignment_label(dev)
        details["angles"]["hip_angle"] = _line_angle(lh, rh)

        # 4. Symétrie genoux
        lk, rk = lm[P.LEFT_KNEE], lm[P.RIGHT_KNEE]
        dev = abs(lk.y - rk.y)
        components["knee_symmetry"] = _deviation_to_score(dev)
        details["knee_diff"] = f"{dev:.4f}"
        details["knee_score"] = components["knee_symmetry"]
        details["knee_alignment"] = _alignment_label(dev)

        # 5. Alignement du tronc (nez → milieu hanches)
        hip_mid_x = (lh.x + rh.x) / 2
        dev = abs(nose.x - hip_mid_x)
        components["trunk_alignment"] = _deviation_to_score(dev)
        details["trunk_deviation"] = f"{dev:.4f}"
        details["trunk_score"] = components["trunk_alignment"]

        # Score d'asymétrie global
        sym_keys = ["shoulder_symmetry", "hip_symmetry", "knee_symmetry"]
        details["asymmetry_score"] = round(
            np.mean([components[k] for k in sym_keys]), 1
        )

        return components, details

    # ─── Vue latérale ─────────────────────────────────────────

    def _score_side(self, lm, h, w, details) -> Tuple[Dict[str, float], Dict]:
        P = self.mp_pose.PoseLandmark
        components: Dict[str, float] = {}

        ear = lm[P.LEFT_EAR]
        shoulder = lm[P.LEFT_SHOULDER]
        hip = lm[P.LEFT_HIP]
        knee = lm[P.LEFT_KNEE]
        ankle = lm[P.LEFT_ANKLE]

        # 1. Forward Head Posture (oreille → épaule en X)
        dev = abs(ear.x - shoulder.x)
        components["forward_head"] = _deviation_to_score(dev)
        details["head_forward"] = f"{dev:.4f}"
        details["head_score"] = components["forward_head"]
        details["head_alignment"] = _alignment_label(dev, "head_forward")

        # 2. Cyphose thoracique (angle épaule-hanche par rapport à la verticale)
        thoracic_angle = abs(_vertical_angle(shoulder, hip))
        thoracic_dev = thoracic_angle / 90.0 * 0.15  # normaliser
        components["thoracic_kyphosis"] = _deviation_to_score(thoracic_dev)
        details["angles"]["thoracic_angle"] = f"{thoracic_angle:.1f}°"
        details["thoracic_score"] = components["thoracic_kyphosis"]

        # 3. Lordose lombaire (angle épaule-hanche-genou)
        lumbar = _angle_3pts(shoulder, hip, knee)
        lumbar_dev = abs(lumbar - 175) / 180.0 * 0.15
        components["lumbar_lordosis"] = _deviation_to_score(lumbar_dev)
        details["lumbar_angle"] = f"{lumbar:.1f}°"
        details["lumbar_score"] = components["lumbar_lordosis"]

        # 4. Alignement vertical (écart moyen à la verticale)
        points = [ear, shoulder, hip, knee, ankle]
        x_coords = [p.x for p in points]
        mean_x = np.mean(x_coords)
        dev = float(np.mean([abs(p.x - mean_x) for p in points]))
        components["vertical_alignment"] = _deviation_to_score(dev)
        details["vertical_alignment"] = f"{dev:.4f}"
        details["vertical_score"] = components["vertical_alignment"]
        details["spinal_curvature"] = _alignment_label(dev, "vertical")

        details["angles"]["spinal_angle"] = f"{_vertical_angle(shoulder, hip):.1f}°"
        details["angles"]["knee_angle"] = f"{_angle_3pts(hip, knee, ankle):.1f}°"

        return components, details

    # ─── Vue dorsale ──────────────────────────────────────────

    def _score_back(self, lm, h, w, details) -> Tuple[Dict[str, float], Dict]:
        P = self.mp_pose.PoseLandmark
        components: Dict[str, float] = {}

        ls, rs = lm[P.LEFT_SHOULDER], lm[P.RIGHT_SHOULDER]
        lh, rh = lm[P.LEFT_HIP], lm[P.RIGHT_HIP]
        # Omoplates approximées par les coudes
        le, re = lm[P.LEFT_ELBOW], lm[P.RIGHT_ELBOW]

        # 1. Symétrie épaules
        dev = abs(ls.y - rs.y)
        components["shoulder_symmetry"] = _deviation_to_score(dev)
        details["shoulder_diff"] = f"{dev:.4f}"
        details["shoulder_score"] = components["shoulder_symmetry"]
        details["shoulder_alignment"] = _alignment_label(dev)

        # 2. Symétrie hanches
        dev = abs(lh.y - rh.y)
        components["hip_symmetry"] = _deviation_to_score(dev)
        details["hip_diff"] = f"{dev:.4f}"
        details["hip_score"] = components["hip_symmetry"]
        details["hip_alignment"] = _alignment_label(dev)

        # 3. Symétrie scapulaire
        dev = abs(le.y - re.y)
        components["scapular_symmetry"] = _deviation_to_score(dev)
        details["scapula_diff"] = f"{dev:.4f}"
        details["scapula_score"] = components["scapular_symmetry"]
        details["scapular_alignment"] = _alignment_label(dev)

        # 4. Alignement spinal (milieu épaules → milieu hanches en X)
        mid_shoulder_x = (ls.x + rs.x) / 2
        mid_hip_x = (lh.x + rh.x) / 2
        dev = abs(mid_shoulder_x - mid_hip_x)
        components["spinal_alignment"] = _deviation_to_score(dev)
        details["spinal_offset"] = f"{dev:.4f}"
        details["spinal_score"] = components["spinal_alignment"]

        sym_keys = ["shoulder_symmetry", "hip_symmetry", "scapular_symmetry"]
        details["asymmetry_score"] = round(
            np.mean([components[k] for k in sym_keys]), 1
        )

        return components, details

    # ══════════════════════════════════════════════════════════
    # DÉTECTION DE PROBLÈMES
    # ══════════════════════════════════════════════════════════

    def _detect_issues(self, lm, view_type: str) -> List[Dict[str, Any]]:
        dispatch = {
            "front": self._issues_front,
            "back": self._issues_back,
            "side": self._issues_side,
        }
        return dispatch.get(view_type, self._issues_front)(lm)

    def _issues_front(self, lm) -> List[Dict[str, Any]]:
        P = self.mp_pose.PoseLandmark
        issues: List[Dict[str, Any]] = []

        try:
            ls, rs = lm[P.LEFT_SHOULDER], lm[P.RIGHT_SHOULDER]

            # Épaules arrondies
            mid_x = (ls.x + rs.x) / 2
            if mid_x > 0.55:
                sev = "Modérée" if mid_x > 0.60 else "Légère"
                issues.append({
                    "issue": "Épaules arrondies vers l'avant",
                    "severity": sev,
                    "impact": "Tension cervicale, respiration limitée",
                    "priority": "Haute" if sev == "Modérée" else "Moyenne",
                })

            # Inclinaison tête
            nose = lm[P.NOSE]
            head_lean = abs(nose.x - mid_x)
            if head_lean > 0.05:
                issues.append({
                    "issue": "Inclinaison latérale de la tête",
                    "severity": "Légère",
                    "impact": "Déséquilibre musculaire du cou",
                    "priority": "Moyenne",
                })

            # Bascule bassin
            lh, rh = lm[P.LEFT_HIP], lm[P.RIGHT_HIP]
            hip_diff = abs(lh.y - rh.y)
            if hip_diff > 0.03:
                sev = "Modérée" if hip_diff > 0.05 else "Légère"
                issues.append({
                    "issue": "Bascule du bassin",
                    "severity": sev,
                    "impact": "Douleurs lombaires, déséquilibre postural",
                    "priority": "Haute",
                })

            # Cyphose (vue frontale approximée)
            s_avg_y = (ls.y + rs.y) / 2
            h_avg_y = (lh.y + rh.y) / 2
            if s_avg_y > h_avg_y + 0.07:
                issues.append({
                    "issue": "Cyphose excessive (dos rond)",
                    "severity": "Modérée",
                    "impact": "Réduction capacité pulmonaire, douleurs dorsales",
                    "priority": "Haute",
                })

        except Exception as e:
            print(f"⚠️ Détection problèmes frontaux : {e}")

        return issues

    def _issues_side(self, lm) -> List[Dict[str, Any]]:
        P = self.mp_pose.PoseLandmark
        issues: List[Dict[str, Any]] = []

        try:
            nose = lm[P.NOSE]
            shoulder = lm[P.LEFT_SHOULDER]
            hip = lm[P.LEFT_HIP]
            knee = lm[P.LEFT_KNEE]
            ankle = lm[P.LEFT_ANKLE]

            # Forward Head Posture
            fwd = abs(nose.x - shoulder.x)
            if fwd > 0.08:
                sev = "Modérée" if fwd > 0.12 else "Légère"
                issues.append({
                    "issue": "Tête penchée en avant (Forward Head)",
                    "severity": sev,
                    "impact": "Douleurs cervicales, tension musculaire",
                    "priority": "Haute",
                })

            # Cyphose thoracique
            if shoulder.y > hip.y + 0.15:
                issues.append({
                    "issue": "Cyphose thoracique excessive (dos rond)",
                    "severity": "Modérée",
                    "impact": "Réduction capacité respiratoire, douleurs dorsales",
                    "priority": "Haute",
                })

            # Lordose lombaire
            if hip.y < knee.y - 0.1:
                issues.append({
                    "issue": "Lordose lombaire excessive",
                    "severity": "Modérée",
                    "impact": "Douleurs lombaires",
                    "priority": "Haute",
                })

            # Hyperextension genoux
            if knee.x < ankle.x - 0.05:
                issues.append({
                    "issue": "Hyperextension des genoux",
                    "severity": "Légère",
                    "impact": "Risque de blessures articulaires",
                    "priority": "Moyenne",
                })

        except Exception as e:
            print(f"⚠️ Détection problèmes latéraux : {e}")

        return issues

    def _issues_back(self, lm) -> List[Dict[str, Any]]:
        P = self.mp_pose.PoseLandmark
        issues: List[Dict[str, Any]] = []

        try:
            ls, rs = lm[P.LEFT_SHOULDER], lm[P.RIGHT_SHOULDER]
            lh, rh = lm[P.LEFT_HIP], lm[P.RIGHT_HIP]

            s_diff = abs(ls.y - rs.y)
            h_diff = abs(lh.y - rh.y)

            # Scoliose
            if s_diff > 0.03 or h_diff > 0.03:
                sev = "Modérée" if (s_diff > 0.05 or h_diff > 0.05) else "Légère"
                issues.append({
                    "issue": "Asymétrie épaules/hanches (signe de scoliose possible)",
                    "severity": sev,
                    "impact": "Déséquilibre musculaire, douleurs dorsales",
                    "priority": "Haute",
                })

            # Inclinaison pelvienne marquée
            if h_diff > 0.05:
                issues.append({
                    "issue": "Inclinaison pelvienne marquée",
                    "severity": "Modérée",
                    "impact": "Déséquilibre musculaire des jambes",
                    "priority": "Haute",
                })

        except Exception as e:
            print(f"⚠️ Détection problèmes dorsaux : {e}")

        return issues

    # ══════════════════════════════════════════════════════════
    # ÉVALUATIONS TEXTUELLES
    # ══════════════════════════════════════════════════════════

    def _build_assessment(self, lm, view: str) -> Dict[str, str]:
        P = self.mp_pose.PoseLandmark
        try:
            return {
                "spinal_alignment": self._eval_spine(lm, view),
                "shoulder_position": self._eval_shoulders(lm, view),
                "pelvic_alignment": self._eval_pelvis(lm, view),
                "head_position": self._eval_head(lm, view),
                "lower_limb_alignment": self._eval_limbs(lm, view),
            }
        except Exception as e:
            print(f"⚠️ Évaluation posturale ({view}) : {e}")
            return {
                "spinal_alignment": "À évaluer",
                "shoulder_position": "À évaluer",
                "pelvic_alignment": "À évaluer",
                "head_position": "À évaluer",
                "lower_limb_alignment": "À évaluer",
            }

    def _eval_spine(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        if view in ("front", "back"):
            s_avg = (lm[P.LEFT_SHOULDER].y + lm[P.RIGHT_SHOULDER].y) / 2
            h_avg = (lm[P.LEFT_HIP].y + lm[P.RIGHT_HIP].y) / 2
            diff = s_avg - h_avg
            if abs(diff) < 0.05:
                return "Alignement vertébral neutre"
            return "Tendance à la cyphose" if diff > 0 else "Alignement satisfaisant"
        # side
        curvature = abs(lm[P.LEFT_SHOULDER].y - lm[P.LEFT_HIP].y)
        if curvature < 0.08:
            return "Courbure spinale normale"
        return "Courbure légère" if curvature < 0.12 else "Courbure importante"

    def _eval_shoulders(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        if view in ("front", "back"):
            diff = abs(lm[P.LEFT_SHOULDER].y - lm[P.RIGHT_SHOULDER].y)
            if diff < 0.02:
                return "Épaules parfaitement alignées"
            if diff < 0.05:
                return "Légère asymétrie des épaules"
            side = "gauche" if lm[P.LEFT_SHOULDER].y > lm[P.RIGHT_SHOULDER].y else "droite"
            return f"Épaule {side} plus haute"
        x = lm[P.LEFT_SHOULDER].x
        if x > 0.55:
            return "Épaules en avant"
        if x < 0.45:
            return "Épaules en arrière"
        return "Position épaules neutre"

    def _eval_pelvis(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        if view in ("front", "back"):
            diff = abs(lm[P.LEFT_HIP].y - lm[P.RIGHT_HIP].y)
            if diff < 0.02:
                return "Bassin parfaitement horizontal"
            if diff < 0.05:
                return "Légère inclinaison du bassin"
            side = "gauche" if lm[P.LEFT_HIP].y > lm[P.RIGHT_HIP].y else "droite"
            return f"Bassin incliné vers la {side}"
        x = lm[P.LEFT_HIP].x
        if x > 0.55:
            return "Bassin antériorisé"
        if x < 0.45:
            return "Bassin rétroversé"
        return "Position bassin neutre"

    def _eval_head(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        nose = lm[P.NOSE]
        if view in ("front", "back"):
            mid = (lm[P.LEFT_SHOULDER].x + lm[P.RIGHT_SHOULDER].x) / 2
            diff = abs(nose.x - mid)
            if diff < 0.03:
                return "Tête bien centrée sur les épaules"
            return "Tête inclinée vers la droite" if nose.x > mid else "Tête inclinée vers la gauche"
        fwd = abs(nose.x - lm[P.LEFT_SHOULDER].x)
        if fwd < 0.05:
            return "Tête bien positionnée"
        return "Tête légèrement en avant" if fwd < 0.08 else "Tête penchée en avant"

    def _eval_limbs(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        diff = abs(lm[P.LEFT_KNEE].y - lm[P.RIGHT_KNEE].y)
        if diff < 0.03:
            return "Alignement des membres inférieurs satisfaisant"
        return "Asymétrie détectée au niveau des genoux"

    # ══════════════════════════════════════════════════════════
    # HELPERS
    # ══════════════════════════════════════════════════════════

    def _determine_posture_type(self, lm, view: str) -> str:
        P = self.mp_pose.PoseLandmark
        try:
            if view in ("front", "back"):
                s_avg = (lm[P.LEFT_SHOULDER].y + lm[P.RIGHT_SHOULDER].y) / 2
                h_avg = (lm[P.LEFT_HIP].y + lm[P.RIGHT_HIP].y) / 2
                diff = s_avg - h_avg
                if diff > 0.07:
                    return "Posture cyphotique (dos rond)"
                if diff < -0.07:
                    return "Posture lordotique (cambrure excessive)"
                return "Posture neutre"
            # side
            c = lm[P.LEFT_SHOULDER].y - lm[P.LEFT_HIP].y
            if c > 0.1:
                return "Cyphose (dos rond)"
            if c < -0.05:
                return "Lordose (cambrure)"
            return "Posture neutre"
        except Exception:
            return "Type de posture à déterminer"

    def _get_insights(self, lm, view: str) -> Dict[str, Any]:
        P = self.mp_pose.PoseLandmark
        insights: Dict[str, Any] = {
            "view_type": view,
            "key_findings": [],
            "recommendations": [],
        }

        try:
            if view == "side":
                nose, sh, hip = lm[P.NOSE], lm[P.LEFT_SHOULDER], lm[P.LEFT_HIP]
                if abs(nose.x - sh.x) > 0.08:
                    insights["key_findings"].append("Port de tête antérieur")
                    insights["recommendations"].append("Exercices de renforcement cervical")
                deviations = [
                    abs(nose.x - sh.x),
                    abs(sh.x - hip.x),
                ]
                if max(deviations) > 0.1:
                    insights["key_findings"].append("Désalignement de la ligne gravitaire")
                    insights["recommendations"].append("Travail d'alignement avec miroir")

            elif view == "back":
                pairs = [
                    (P.LEFT_SHOULDER, P.RIGHT_SHOULDER),
                    (P.LEFT_HIP, P.RIGHT_HIP),
                    (P.LEFT_KNEE, P.RIGHT_KNEE),
                ]
                diffs = [abs(lm[l].y - lm[r].y) for l, r in pairs]
                if np.mean(diffs) > 0.03:
                    insights["key_findings"].append("Asymétrie corporelle détectée")
                    insights["recommendations"].append(
                        "Exercices unilatéraux pour rééquilibrer"
                    )

        except Exception as e:
            print(f"⚠️ Insights ({view}) : {e}")

        return insights

    @staticmethod
    def _confidence_label(n_views: int, views: List[str]) -> str:
        if n_views >= 3:
            return "Très élevée"
        if n_views == 2:
            if {"front", "side"}.issubset(views):
                return "Élevée"
            if "front" in views:
                return "Moyenne-Élevée"
            return "Moyenne"
        if n_views == 1:
            return "Moyenne" if "front" in views else "Faible-Moyenne"
        return "Faible"

    @staticmethod
    def _default_analysis(view_type: str) -> Dict[str, Any]:
        msg = {
            "front": "Image frontale nécessaire",
            "back": "Image dorsale nécessaire",
            "side": "Image latérale nécessaire",
        }.get(view_type, "Image nécessaire")

        return {
            "postural_assessment": {
                "spinal_alignment": msg,
                "shoulder_position": "À évaluer",
                "pelvic_alignment": "À évaluer",
                "head_position": "Position normale",
                "lower_limb_alignment": "À évaluer",
                "view_type": view_type,
            },
            "posture_score": 65.0,
            "posture_grade": "À évaluer",
            "detected_issues": [
                {
                    "issue": f"Image {view_type} insuffisante",
                    "severity": "Information",
                    "priority": "Basse",
                }
            ],
            "posture_type": "À déterminer",
            "improvement_recommendations": [],
            "landmark_analysis": {},
            "view_specific_insights": {
                "view_type": view_type,
                "key_findings": [],
                "recommendations": [],
            },
        }


# ══════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES (module-level, réutilisables)
# ══════════════════════════════════════════════════════════════


def _deviation_to_score(deviation: float) -> float:
    """
    Convertit une déviation normalisée (0-1) en score (0-100).

    Seuils (fraction de l'image) :
      ≤ 0.02 → 90-100   (excellent)
        0.04 → 80-90     (bon)
        0.06 → 70-80     (moyen)
        0.08 → 60-70     (faible)
      > 0.08 → < 60      (très faible)
    """
    T = POSTURE_THRESHOLDS
    if deviation <= T["excellent"]:
        return 100 - (deviation / T["excellent"]) * 10
    if deviation <= T["good"]:
        return 90 - (deviation - T["excellent"]) / (T["good"] - T["excellent"]) * 10
    if deviation <= T["fair"]:
        return 80 - (deviation - T["good"]) / (T["fair"] - T["good"]) * 10
    if deviation <= T["poor"]:
        return 70 - (deviation - T["fair"]) / (T["poor"] - T["fair"]) * 10
    return max(0, 60 - min(20, (deviation - T["poor"]) * 200))


def _alignment_label(deviation: float, part: str = "") -> str:
    """Étiquette textuelle pour une déviation."""
    T = POSTURE_THRESHOLDS
    labels = {
        "head_forward": [
            "Position de tête optimale",
            "Légère avancée de la tête",
            "Tête modérément en avant",
            "Tête significativement en avant",
            "Posture de tête très avancée",
        ],
        "vertical": [
            "Alignement vertical parfait",
            "Bon alignement vertical",
            "Alignement vertical acceptable",
            "Désalignement vertical notable",
            "Désalignement vertical sévère",
        ],
        "head": [
            "Tête parfaitement centrée",
            "Légère inclinaison de la tête",
            "Inclinaison modérée de la tête",
            "Inclinaison importante de la tête",
            "Inclinaison sévère de la tête",
        ],
    }
    default = [
        "Symétrie parfaite",
        "Légère asymétrie",
        "Asymétrie modérée",
        "Asymétrie importante",
        "Asymétrie sévère",
    ]
    texts = labels.get(part, default)
    thresholds = [T["excellent"], T["good"], T["fair"], T["poor"]]
    for i, t in enumerate(thresholds):
        if deviation <= t:
            return texts[i]
    return texts[-1]


def _line_angle(p1, p2) -> float:
    """Angle d'inclinaison (°) entre deux landmarks par rapport à l'horizontale."""
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    return round(abs(math.degrees(math.atan2(dy, dx))), 1)


def _vertical_angle(top, bottom) -> float:
    """Angle par rapport à la verticale entre deux points."""
    dx = bottom.x - top.x
    dy = bottom.y - top.y
    return round(math.degrees(math.atan2(dx, dy)), 1)


def _angle_3pts(a, b, c) -> float:
    """Angle au point B entre les segments BA et BC (en degrés)."""
    v1 = (a.x - b.x, a.y - b.y)
    v2 = (c.x - b.x, c.y - b.y)
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    n1 = math.sqrt(v1[0] ** 2 + v1[1] ** 2)
    n2 = math.sqrt(v2[0] ** 2 + v2[1] ** 2)
    if n1 * n2 == 0:
        return 0.0
    cos_a = max(-1, min(1, dot / (n1 * n2)))
    return round(math.degrees(math.acos(cos_a)), 1)
