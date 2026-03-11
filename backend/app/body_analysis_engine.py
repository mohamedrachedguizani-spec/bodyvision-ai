"""
BodyVision AI  Facade d'analyse corporelle.

Ce fichier expose l'interface historique `body_analysis_engine`
utilisee par ai_services.py et analysis_routes.py.

Toute la logique est desormais dans le package `app.analysis` :
  - YoloBodyClassifier     -> classification YOLO
  - BodyCompositionAnalyzer -> composition corporelle
  - PostureAnalysisEngine   -> analyse posturale multi-vues
  - RecommendationEngine    -> recommandations ciblees

Ce module instancie les sous-moteurs une seule fois et delegue.
"""

from typing import Dict, Any, List, Optional

# Import lazy — évite le crash au démarrage si libGL.so.1 est absent
try:
    from app.analysis.yolo_classifier import YoloBodyClassifier as _YoloBodyClassifier
    _YOLO_AVAILABLE = True
except (ImportError, OSError, RuntimeError) as _e:
    print(f"⚠️  body_analysis_engine: YoloBodyClassifier non disponible : {_e}")
    _YoloBodyClassifier = None
    _YOLO_AVAILABLE = False

from app.analysis.body_composition import BodyCompositionAnalyzer
from app.analysis.posture_engine import PostureAnalysisEngine
from app.analysis.recommendations import RecommendationEngine


class BodyAnalysisEngine:
    """
    Facade retro-compatible.

    Toutes les methodes appelees par le reste du code (ai_services,
    analysis_routes) sont disponibles ici et deleguent aux sous-moteurs.
    """

    def __init__(self):
        self.yolo = _YoloBodyClassifier() if _YOLO_AVAILABLE else None
        self.composition = BodyCompositionAnalyzer()
        self.posture = PostureAnalysisEngine()
        self.recommendations = RecommendationEngine()

    # YOLO
    def analyze_with_yolo(self, image_path: str) -> Dict[str, Any]:
        if self.yolo is None:
            return {"error": "YOLO non disponible (libGL manquant)", "body_type": "Unavailable", "confidence": 0.0}
        return self.yolo.classify(image_path)

    # COMPOSITION CORPORELLE
    def analyze_body_composition(
        self, user_data: Dict[str, Any], yolo_classification: Dict[str, Any]
    ) -> Dict[str, Any]:
        return self.composition.analyze(user_data, yolo_classification)

    # POSTURE
    def analyze_posture_with_mediapipe(
        self, image_path: str, view_type: str = "front"
    ) -> Dict[str, Any]:
        result = self.posture.analyze(image_path, view_type)
        issues = result.get("detected_issues", [])
        result["improvement_recommendations"] = (
            self.recommendations.from_posture_issues(issues)
        )
        return result

    def calculate_comprehensive_posture_score(
        self, multi_view_analyses: Dict[str, Dict]
    ) -> Optional[Dict[str, Any]]:
        comprehensive = self.posture.compute_comprehensive_score(multi_view_analyses)
        if comprehensive is None:
            return None
        primary_problems = self._identify_primary_problems(multi_view_analyses)
        comprehensive["primary_postural_problems"] = primary_problems
        comprehensive["recommendations_priority"] = (
            self.recommendations.priority_from_problems(primary_problems)
        )
        return comprehensive

    # RECOMMANDATIONS
    def get_detailed_recommendations(
        self, posture_analysis: Dict[str, Any], body_composition: Dict[str, Any],
    ) -> Dict[str, Any]:
        return self.recommendations.from_body_composition(
            posture_analysis, body_composition
        )

    # FALLBACKS
    @staticmethod
    def _get_default_posture_analysis(view_type: str = "front") -> Dict[str, Any]:
        return PostureAnalysisEngine._default_analysis(view_type)

    @staticmethod
    def _get_default_muscle_analysis() -> Dict[str, Any]:
        return {
            "muscle_groups_assessment": {
                "upper_body": {
                    "chest_development": "Analyse necessitant une image plus claire",
                    "back_development": "A evaluer avec photo frontale",
                    "shoulders_development": "Position des epaules normale",
                    "arms_development": "Developpement standard",
                },
                "lower_body": {
                    "quadriceps_development": "A evaluer avec vue complete",
                    "hamstrings_development": "Developpement standard",
                    "glutes_development": "A determiner",
                    "calves_development": "Developpement normal",
                },
                "core": {
                    "abdominal_development": "Analyse necessitant vue laterale",
                    "obliques_development": "A evaluer",
                    "lower_back_development": "Developpement standard",
                },
            },
            "development_balance": {
                "upper_lower_ratio": "A determiner",
                "push_pull_balance": "Equilibre normal",
                "anterior_posterior_balance": "A evaluer par professionnel",
            },
            "strength_indicators": {
                "estimated_strength_level": "Niveau moyen",
                "weak_points": ["Evaluation complete recommandee"],
                "strong_points": ["Aucun point fort specifique identifie"],
            },
            "asymmetries_detailed": [],
            "growth_potential_analysis": {
                "immediate_focus": "Amelioration globale recommandee",
                "long_term_potential": "Potentiel normal",
            },
            "muscle_maturity_assessment": "Maturite musculaire standard",
        }

    @staticmethod
    def _get_default_health_assessment() -> Dict[str, Any]:
        return {
            "overall_health_status": {
                "rating": "Bon",
                "score": 75,
                "summary": "Etat general satisfaisant, surveillance recommandee",
            },
            "professional_consultation": "Bilan medical annuel recommande",
        }

    # IDENTIFICATION DES PROBLEMES PRIORITAIRES (MULTI-VUES)
    def _identify_primary_problems(
        self, multi_view_analyses: Dict[str, Dict]
    ) -> List[Dict]:
        all_problems: List[Dict] = []
        for view_type, analysis in multi_view_analyses.items():
            if not analysis or not isinstance(analysis, dict):
                continue
            details = analysis.get("landmark_analysis", analysis.get("detailed_analysis", {}))
            extractors = {
                "front": self._extract_frontal,
                "side": self._extract_sagittal,
                "back": self._extract_dorsal,
            }
            extractor = extractors.get(view_type)
            if extractor:
                all_problems.extend(extractor(details))
        order = {"Haute": 0, "Moyenne": 1, "Basse": 2}
        all_problems.sort(key=lambda p: order.get(p.get("severity", "Basse"), 2))
        return all_problems[:5]

    @staticmethod
    def _extract_frontal(details: Dict) -> List[Dict]:
        problems: List[Dict] = []
        for key, ptype, desc_tpl, impact in [
            ("shoulder_score", "asymetrie_epaules",
             "Asymetrie des epaules (score : {})", "Desequilibre musculaire, douleurs cervicales"),
            ("hip_score", "bascule_bassin",
             "Bascule du bassin (score : {})", "Douleurs lombaires, desequilibre postural"),
            ("head_score", "inclinaison_tete",
             "Inclinaison laterale de la tete (score : {})", "Tensions cervicales"),
        ]:
            score = details.get(key, 100)
            if isinstance(score, (int, float)) and score < 70:
                sev = "Haute" if score < 60 else "Moyenne"
                problems.append({
                    "type": ptype, "severity": sev,
                    "description": desc_tpl.format(round(score, 1)),
                    "impact": impact,
                })
        return problems

    @staticmethod
    def _extract_sagittal(details: Dict) -> List[Dict]:
        problems: List[Dict] = []
        for key, ptype, desc_tpl, impact in [
            ("head_score", "tete_avant",
             "Tete penchee vers l'avant (score : {})", "Douleurs cervicales, tension musculaire"),
            ("vertical_score", "desalignement_vertical",
             "Desalignement de la colonne vertebrale (score : {})", "Posture globale compromise"),
        ]:
            score = details.get(key, 100)
            if isinstance(score, (int, float)) and score < 70:
                sev = "Haute" if score < 60 else "Moyenne"
                problems.append({
                    "type": ptype, "severity": sev,
                    "description": desc_tpl.format(round(score, 1)),
                    "impact": impact,
                })
        return problems

    @staticmethod
    def _extract_dorsal(details: Dict) -> List[Dict]:
        problems: List[Dict] = []
        for key, ptype, desc_tpl, impact in [
            ("shoulder_score", "scoliose_indicateur",
             "Asymetrie epaules - possible scoliose (score : {})", "Desequilibre postural"),
            ("hip_score", "asymetrie_bassin",
             "Asymetrie du bassin (score : {})", "Desequilibre postural, douleurs lombaires"),
        ]:
            score = details.get(key, 100)
            if isinstance(score, (int, float)) and score < 70:
                sev = "Haute" if score < 60 else "Moyenne"
                problems.append({
                    "type": ptype, "severity": sev,
                    "description": desc_tpl.format(round(score, 1)),
                    "impact": impact,
                })
        return problems


# Instance globale (retro-compatibilite)
# Protégée contre l'absence de libGL / du modèle YOLO
try:
    body_analysis_engine = BodyAnalysisEngine()
except (ImportError, OSError, RuntimeError, FileNotFoundError) as _bae_err:
    print(f"⚠️  BodyAnalysisEngine init partielle (YOLO indisponible) : {_bae_err}")

    class _FallbackEngine(BodyAnalysisEngine):
        def __init__(self):  # noqa: E303
            # Ne pas appeler super().__init__() — instanciation sans YOLO
            self.yolo = None
            self.composition = BodyCompositionAnalyzer()
            self.posture = PostureAnalysisEngine()
            self.recommendations = RecommendationEngine()

    body_analysis_engine = _FallbackEngine()
