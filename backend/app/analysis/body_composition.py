"""
Calcul de la composition corporelle.

Formules utilisées :
  • CUN-BAE  — pourcentage de masse grasse
  • Boer     — masse maigre (Lean Body Mass)
  • SMM      — masse musculaire squelettique (Skeletal Muscle Mass)
  • Mifflin-St Jeor — métabolisme de base (BMR)
  • Watson (simplifié) — eau corporelle
  • Heymsfield et al.  — masse osseuse

Ce module NE dépend PAS de YOLO ni de MediaPipe ; il reçoit les données
en entrée et retourne un dictionnaire de résultats.
"""

from typing import Dict, Any, Optional, Tuple

from app.analysis.constants import (
    ACTIVITY_FACTORS,
    NORMAL_FAT_RANGES,
    BMI_FAT_THRESHOLDS,
)


class BodyCompositionAnalyzer:
    """Calculs déterministes de composition corporelle."""

    # ══════════════════════════════════════════════════════════
    # FORMULES DE BASE
    # ══════════════════════════════════════════════════════════

    @staticmethod
    def calculate_bmi(weight_kg: float, height_cm: float) -> float:
        """Indice de masse corporelle."""
        height_m = height_cm / 100.0
        return round(weight_kg / (height_m * height_m), 1)

    @staticmethod
    def calculate_body_fat_cun_bae(sex: str, age: int, bmi: float) -> float:
        """
        Pourcentage de masse grasse — formule CUN-BAE.

        Référence : Gómez-Ambrosi et al., 2012.
        gender = 1 (homme) ou 0 (femme).
        """
        gender = 1 if sex.lower() == "male" else 0
        bmi2 = bmi * bmi

        bf = (
            -44.988
            + 0.503 * age
            + 10.689 * gender
            + 3.172 * bmi
            - 0.026 * bmi2
            + 0.181 * bmi * gender
            - 0.02 * bmi * age
            - 0.005 * bmi2 * gender
            + 0.00021 * bmi2 * age
        )
        return round(bf, 2)

    @staticmethod
    def calculate_lean_body_mass(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
        """
        Masse maigre (LBM) — formule de Boer.

        Homme : LBM = 0.407 × poids + 0.267 × taille − 19.2
        Femme : LBM = 0.252 × poids + 0.473 × taille − 48.3
        Ajustement ± 2 % selon l'âge.
        """
        if sex.lower() == "male":
            lbm = 0.407 * weight_kg + 0.267 * height_cm - 19.2
        else:
            lbm = 0.252 * weight_kg + 0.473 * height_cm - 48.3

        # Ajustement âge
        if age > 40:
            lbm *= 0.98
        elif age < 25:
            lbm *= 1.02

        return round(max(lbm, weight_kg * 0.60), 1)

    @staticmethod
    def calculate_skeletal_muscle_mass(
        lbm: float, sex: str, age: int, activity_level: str = "moderate"
    ) -> float:
        """
        Masse musculaire squelettique (SMM).

        SMM = LBM × coefficient_sexe × coefficient_activité.
        Homme : ~40-50 % de LBM   |   Femme : ~30-40 % de LBM.
        """
        coeff = 0.45 if sex.lower() == "male" else 0.35

        # Ajustement âge
        if age < 25:
            coeff *= 1.05
        elif age > 50:
            coeff *= 0.95

        # Ajustement activité
        activity = ACTIVITY_FACTORS.get(activity_level.lower(), 1.0)
        smm = lbm * coeff * activity

        # Limites réalistes
        if sex.lower() == "male":
            smm = max(lbm * 0.35, min(smm, lbm * 0.55))
        else:
            smm = max(lbm * 0.25, min(smm, lbm * 0.45))

        return round(smm, 1)

    @staticmethod
    def calculate_bmr(weight: float, height: float, age: int, sex: str) -> Optional[float]:
        """Métabolisme de base (Mifflin-St Jeor)."""
        if not all([weight, height, age, sex]):
            return None
        offset = 5 if sex.lower() == "male" else -161
        return round(10 * weight + 6.25 * height - 5 * age + offset)

    # ══════════════════════════════════════════════════════════
    # ESTIMATIONS COMPLÉMENTAIRES
    # ══════════════════════════════════════════════════════════

    @staticmethod
    def estimate_visceral_fat(body_fat_pct: float, sex: str, age: int) -> float:
        """
        Niveau de graisse viscérale (échelle 1-20).

        1-9 : normal | 10-14 : élevé | 15+ : très élevé.
        """
        if sex.lower() == "male":
            base = (body_fat_pct - 10) * 0.5 + 3
        else:
            base = (body_fat_pct - 15) * 0.35 + 2

        age_factor = (
            0.85 if age < 30
            else 1.0 if age < 40
            else 1.15 if age < 50
            else 1.30 if age < 60
            else 1.45
        )
        return round(max(1, min(20, base * age_factor)), 1)

    @staticmethod
    def estimate_body_water(weight_kg: float, sex: str, age: int) -> float:
        """Eau corporelle totale en kg (Watson simplifié)."""
        ratio = 0.60 if sex.lower() == "male" else 0.52
        if age and age > 65:
            ratio -= 0.05
        elif age and age > 50:
            ratio -= 0.03
        return round(weight_kg * ratio, 1)

    @staticmethod
    def estimate_bone_mass(weight_kg: float, height_cm: float, sex: str) -> float:
        """Masse osseuse estimée en kg (Heymsfield)."""
        if sex.lower() == "male":
            bone = 2.5 if weight_kg < 65 else (3.2 if weight_kg < 95 else 3.7)
            if height_cm and height_cm > 180:
                bone += 0.3
            elif height_cm and height_cm < 165:
                bone -= 0.2
        else:
            bone = 1.8 if weight_kg < 50 else (2.4 if weight_kg < 75 else 2.9)
            if height_cm and height_cm > 170:
                bone += 0.2
            elif height_cm and height_cm < 155:
                bone -= 0.2
        return round(bone, 1)

    # ══════════════════════════════════════════════════════════
    # AJUSTEMENT YOLO
    # ══════════════════════════════════════════════════════════

    def adjust_body_fat_with_yolo(
        self,
        body_fat_pct: float,
        yolo_class: str,
        bmi: float,
        sex: str,
        weight_kg: float,
    ) -> Tuple[float, float]:
        """
        Ajuste le % et la masse de graisse en fonction de la classe YOLO.
        Retourne (body_fat_pct_adjusted, body_fat_kg_adjusted).
        """
        cls = yolo_class.lower()

        if "musculaire" in cls:
            pct = self._adjust_muscular(body_fat_pct, bmi, sex)
        elif "obèse" in cls or "obes" in cls:
            pct = self._adjust_obese(body_fat_pct, sex)
        elif "surpoids" in cls:
            pct = self._adjust_overweight(body_fat_pct, sex)
        elif "maigre" in cls or "minc" in cls:
            pct = self._adjust_lean(body_fat_pct, sex)
        elif "moyenne" in cls:
            target = self._get_normal_fat_range(sex, bmi)
            pct = self._clamp_to_range(body_fat_pct, target)
        else:
            pct = body_fat_pct

        kg = round(weight_kg * (pct / 100), 1)
        return round(pct, 1), kg

    # ─── Ajustements internes ─────────────────────────────────

    @staticmethod
    def _adjust_muscular(bf: float, bmi: float, sex: str) -> float:
        if sex.lower() == "male":
            if bmi < 22:
                return max(8, min(15, bf * 0.5))
            elif bmi < 25:
                return max(10, min(18, bf * 0.6))
            return max(12, min(20, bf * 0.7))
        else:
            if bmi < 20:
                return max(14, min(22, bf * 0.6))
            elif bmi < 23:
                return max(16, min(24, bf * 0.7))
            return max(18, min(26, bf * 0.8))

    @staticmethod
    def _adjust_obese(bf: float, sex: str) -> float:
        if sex.lower() == "male":
            return min(40, max(25, bf * 1.4))
        return min(45, max(30, bf * 1.4))

    @staticmethod
    def _adjust_overweight(bf: float, sex: str) -> float:
        if sex.lower() == "male":
            return min(30, max(20, bf * 1.3))
        return min(35, max(25, bf * 1.3))

    @staticmethod
    def _adjust_lean(bf: float, sex: str) -> float:
        if sex.lower() == "male":
            return max(6, min(15, bf * 0.5))
        return max(12, min(20, bf * 0.6))

    @staticmethod
    def _get_normal_fat_range(sex: str, bmi: float) -> Tuple[float, float]:
        key = sex.lower()
        thresholds = BMI_FAT_THRESHOLDS.get(key, (22.0, 25.0))
        ranges = NORMAL_FAT_RANGES.get(key, NORMAL_FAT_RANGES["male"])

        if bmi < thresholds[0]:
            return ranges["low_bmi"]
        elif bmi < thresholds[1]:
            return ranges["mid_bmi"]
        return ranges["high_bmi"]

    @staticmethod
    def _clamp_to_range(bf: float, target: Tuple[float, float]) -> float:
        low, high = target
        if bf > high:
            return max(low, min(high, bf * 0.75))
        elif bf < low:
            return max(low, min(high, bf * 1.2))
        return bf

    # ══════════════════════════════════════════════════════════
    # CLASSIFICATION FINALE
    # ══════════════════════════════════════════════════════════

    @staticmethod
    def determine_body_class(
        body_fat_pct: Optional[float],
        yolo_class: str,
        bmi: Optional[float],
        sex: str,
        yolo_confidence: float = 0.5,
    ) -> str:
        """
        Détermine la classe corporelle finale.
        Priorité YOLO si confiance > 0.7, fusion si 0.5-0.7, sinon calculs seuls.
        """
        cls = yolo_class.lower()

        # ── Haute confiance YOLO (> 0.7) ─────────────────────
        if yolo_confidence > 0.7:
            if "musculaire" in cls:
                return "Athlétique/Musculaire"
            if "obèse" in cls:
                return "Obèse"
            if "surpoids" in cls:
                return "Surpoids"
            if "maigre" in cls:
                return "Maigre"
            if "moyenne" in cls:
                return _classify_by_metrics(body_fat_pct, bmi, sex, "Normal/Moyen")

        # ── Confiance moyenne (0.5-0.7) ──────────────────────
        if yolo_confidence > 0.5 and "moyenne" in cls:
            return _classify_by_metrics(body_fat_pct, bmi, sex, "Normal/Moyen")

        # ── Basse confiance → calculs seuls ──────────────────
        return _classify_from_metrics_only(body_fat_pct, bmi, sex)

    # ══════════════════════════════════════════════════════════
    # ANALYSE COMPLÈTE
    # ══════════════════════════════════════════════════════════

    def analyze(
        self, user_data: Dict[str, Any], yolo_classification: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Point d'entrée principal : calcule toutes les métriques de
        composition corporelle à partir des données utilisateur et YOLO.
        """
        weight = user_data.get("weight")
        height = user_data.get("height")
        age = user_data.get("age")
        sex = user_data.get("sex", yolo_classification.get("gender", "male"))
        activity = user_data.get("activity_level", "moderate")

        bmi = self.calculate_bmi(weight, height) if weight and height else None

        yolo_class = yolo_classification.get("primary_class", "Moyenne")
        yolo_conf = yolo_classification.get("confidence", 0.5)

        # Calcul principal
        bf_pct = bf_kg = lbm = smm = None
        if all([weight, height, age, sex, bmi]):
            try:
                bf_pct_base = self.calculate_body_fat_cun_bae(sex, age, bmi)
                bf_pct, bf_kg = self.adjust_body_fat_with_yolo(
                    bf_pct_base, yolo_class, bmi, sex, weight
                )

                # Ajustement supplémentaire haute confiance
                if yolo_conf > 0.7 and "moyenne" in yolo_class.lower():
                    limit = 25 if sex.lower() == "male" else 30
                    if bf_pct > limit:
                        bf_pct = round(max(limit - 7, min(limit, bf_pct * 0.8)), 1)
                        bf_kg = round(weight * bf_pct / 100, 1)

                lbm = self.calculate_lean_body_mass(weight, height, age, sex)
                smm = self.calculate_skeletal_muscle_mass(lbm, sex, age, activity)

                # Cohérence : somme des composants ≤ poids
                if bf_kg and lbm and (bf_kg + lbm) > weight * 1.05:
                    total = bf_kg + lbm
                    bf_kg = round(bf_kg * weight / total, 1)
                    lbm = round(lbm * weight / total, 1)
                    bf_pct = round(bf_kg / weight * 100, 1)
                    smm = round(min(smm, lbm * 0.55), 1)

            except Exception as e:
                print(f"⚠️ Erreur calcul composition corporelle : {e}")

        body_class = self.determine_body_class(bf_pct, yolo_class, bmi, sex, yolo_conf)

        return {
            "weight": weight,
            "height": height,
            "bmi": bmi,
            "body_fat_percentage": bf_pct,
            "body_fat_kg": bf_kg,
            "lean_body_mass_kg": lbm,
            "skeletal_muscle_mass_kg": smm,
            "body_composition_class": body_class,
            "yolo_classification": yolo_classification,
            "yolo_primary_class": yolo_class,
            "yolo_confidence": yolo_conf,
            "age": age,
            "sex": sex,
            "body_water_estimated": (
                self.estimate_body_water(weight, sex, age) if weight else None
            ),
            "bone_mass_estimated": (
                self.estimate_bone_mass(weight, height, sex) if weight and height else None
            ),
            "visceral_fat_estimated": (
                self.estimate_visceral_fat(bf_pct, sex, age) if bf_pct else None
            ),
            "analysis_notes": (
                f"Priorité YOLO : {'Élevée' if yolo_conf > 0.7 else 'Moyenne'}"
            ),
        }


# ══════════════════════════════════════════════════════════════
# FONCTIONS AUXILIAIRES (module-level)
# ══════════════════════════════════════════════════════════════


def _classify_by_metrics(
    bf: Optional[float], bmi: Optional[float], sex: str, default: str
) -> str:
    """Vérifie les limites extrêmes même quand YOLO dit « Moyenne »."""
    if bf is None or bmi is None:
        return default
    if sex.lower() == "male":
        if bf > 30 or bmi > 30:
            return "Surpoids"
        if bf < 10 or bmi < 18.5:
            return "Maigre"
    else:
        if bf > 35 or bmi > 30:
            return "Surpoids"
        if bf < 15 or bmi < 18.5:
            return "Maigre"
    return default


def _classify_from_metrics_only(
    bf: Optional[float], bmi: Optional[float], sex: str
) -> str:
    """Classification basée uniquement sur les métriques (pas de YOLO)."""
    if bf is None or bmi is None:
        return "Indéterminé"

    # Seuils par sexe
    if sex.lower() == "male":
        thresholds = [
            (8, "Très maigre (athlétique extrême)"),
            (12, "Athlétique"),
            (20, "Normal (en forme)" if bmi < 25 else "Surpoids"),
            (25, "Surpoids"),
        ]
    else:
        thresholds = [
            (14, "Très maigre (athlétique extrême)"),
            (18, "Athlétique"),
            (25, "Normal (en forme)" if bmi < 25 else "Surpoids"),
            (30, "Surpoids"),
        ]

    for limit, label in thresholds:
        if bf < limit:
            return label
    return "Obèse"
