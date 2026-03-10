"""
Constantes, seuils et tables de référence pour l'analyse corporelle.

Toutes les valeurs de calibration sont centralisées ici pour faciliter
l'ajustement et les tests.
"""

from typing import Dict, Tuple

# ══════════════════════════════════════════════════════════════
# YOLO
# ══════════════════════════════════════════════════════════════

YOLO_CLASSES: list[str] = [
    "Moyenne", "Homme", "Musculaire", "Surpoids", "Maigre", "Obèse", "Femme",
]

YOLO_CLASS_CORRECTIONS: Dict[str, str] = {
    "Obse": "Obèse",
    "Obs": "Obèse",
    "Obes": "Obèse",
    "Homm": "Homme",
    "Femm": "Femme",
    "Moyenn": "Moyenne",
    "Moyen": "Moyenne",
    "Musculair": "Musculaire",
    "Surpoid": "Surpoids",
    "Maigr": "Maigre",
    "Minc": "Maigre",
}

GENDER_CLASSES = {"Homme", "Femme"}
BODY_TYPE_CLASSES = {"Musculaire", "Surpoids", "Maigre", "Obèse", "Moyenne"}

# ══════════════════════════════════════════════════════════════
# PONDÉRATIONS MULTI-VUES
# ══════════════════════════════════════════════════════════════

VIEW_WEIGHTS: Dict[str, float] = {
    "front": 0.35,   # symétrie et alignement frontal
    "back": 0.30,    # scoliose et asymétrie dorsale
    "side": 0.35,    # courbures sagittales
}

# ══════════════════════════════════════════════════════════════
# POSTURE — SEUILS DE DÉVIATION NORMALISÉE
# ══════════════════════════════════════════════════════════════
# Ces seuils sont exprimés en fraction de la dimension de l'image.
# Ex.: 0.02 = 2 % de la hauteur → déviation « excellente ».

POSTURE_THRESHOLDS: Dict[str, float] = {
    "excellent": 0.02,
    "good": 0.04,
    "fair": 0.06,
    "poor": 0.08,
    "critical": 0.10,
}

# Pondérations par composante posturale — vue FRONTALE
FRONT_VIEW_WEIGHTS: Dict[str, float] = {
    "shoulder_symmetry": 0.25,
    "head_alignment": 0.20,
    "hip_symmetry": 0.25,
    "knee_symmetry": 0.15,
    "trunk_alignment": 0.15,
}

# Pondérations par composante posturale — vue LATÉRALE
SIDE_VIEW_WEIGHTS: Dict[str, float] = {
    "forward_head": 0.25,
    "thoracic_kyphosis": 0.25,
    "lumbar_lordosis": 0.25,
    "vertical_alignment": 0.25,
}

# Pondérations par composante posturale — vue DORSALE
BACK_VIEW_WEIGHTS: Dict[str, float] = {
    "shoulder_symmetry": 0.30,
    "hip_symmetry": 0.30,
    "scapular_symmetry": 0.20,
    "spinal_alignment": 0.20,
}

# ══════════════════════════════════════════════════════════════
# COMPOSITION CORPORELLE — PLAGES DE RÉFÉRENCE
# ══════════════════════════════════════════════════════════════

# Plages de graisse corporelle « normales » par sexe / BMI
NORMAL_FAT_RANGES: Dict[str, Dict[str, Tuple[float, float]]] = {
    "male": {
        "low_bmi": (12.0, 18.0),    # BMI < 22
        "mid_bmi": (15.0, 22.0),    # 22 ≤ BMI < 25
        "high_bmi": (18.0, 25.0),   # BMI ≥ 25
    },
    "female": {
        "low_bmi": (18.0, 24.0),    # BMI < 20
        "mid_bmi": (20.0, 26.0),    # 20 ≤ BMI < 23
        "high_bmi": (22.0, 28.0),   # BMI ≥ 23
    },
}

# Seuils BMI pour choisir la bonne plage de graisse
BMI_FAT_THRESHOLDS: Dict[str, Tuple[float, float]] = {
    "male": (22.0, 25.0),
    "female": (20.0, 23.0),
}

# ══════════════════════════════════════════════════════════════
# COEFFICIENTS D'ACTIVITÉ (SMM)
# ══════════════════════════════════════════════════════════════

ACTIVITY_FACTORS: Dict[str, float] = {
    "sedentary": 0.95,
    "light": 1.00,
    "moderate": 1.05,
    "active": 1.10,
    "athlete": 1.15,
}

# ══════════════════════════════════════════════════════════════
# RECOMMANDATIONS — MAPPING PROBLÈME → PROTOCOLE
# ══════════════════════════════════════════════════════════════

PROBLEM_PROTOCOLS: Dict[str, Dict] = {
    "asymétrie_épaules": {
        "category": "Correction posturale",
        "exercises": [
            "Rétractions scapulaires avec élastique 3×15",
            "Y-T-W-L sur swiss ball 2×10 chaque",
            "Étirement pectoraux portique 30 s chaque côté",
        ],
        "frequency": "4×/semaine",
        "priority": "Haute",
    },
    "bascule_bassin": {
        "category": "Équilibre pelvien",
        "exercises": [
            "Pont fessier unilatéral 3×12 chaque jambe",
            "Planche latérale avec rotation 2×10 chaque côté",
            "Étirement psoas 30 s chaque jambe",
        ],
        "frequency": "5×/semaine",
        "priority": "Haute",
    },
    "tête_avant": {
        "category": "Alignement cervical",
        "exercises": [
            "Chin tucks 3×10 avec maintien 5 s",
            "Renforcement profond du cou 2×10",
            "Étirements scalènes 30 s chaque côté",
        ],
        "frequency": "Quotidien",
        "priority": "Haute",
    },
    "désalignement_vertical": {
        "category": "Alignement spinal",
        "exercises": [
            "Posture du mur 5 min/jour",
            "Exercice de la chaise 3×30 s",
            "Renforcement muscles profonds du dos",
        ],
        "frequency": "Quotidien",
        "priority": "Haute",
    },
    "scoliose_indicateur": {
        "category": "Consultation spécialisée",
        "exercises": [
            "Consulter un kinésithérapeute ou un orthopédiste",
            "Exercices de renforcement unilatéral",
            "Travail de symétrie avec miroir",
        ],
        "frequency": "Selon recommandation",
        "priority": "Urgent",
    },
    "cyphose": {
        "category": "Colonne vertébrale",
        "exercises": [
            "Superman 3×15 avec maintien 3 s",
            "Rowing inversé avec TRX 3×12",
            "Extension thoracique sur rouleau 2×10",
        ],
        "frequency": "3×/semaine",
        "priority": "Haute",
    },
    "lordose": {
        "category": "Santé lombaire",
        "exercises": [
            "Planche abdominale 3×30 s",
            "Étirement psoas 30 s chaque jambe",
            "Exercice du chat-chameau 2×10",
        ],
        "frequency": "4×/semaine",
        "priority": "Moyenne",
    },
    "inclinaison_tête": {
        "category": "Équilibre cervical",
        "exercises": [
            "Étirements trapèze supérieur 30 s chaque côté",
            "Renforcement cervical isométrique 3×8",
            "Auto-massage de la nuque avec balle",
        ],
        "frequency": "Quotidien",
        "priority": "Moyenne",
    },
}

# ══════════════════════════════════════════════════════════════
# GRADES POSTURAUX
# ══════════════════════════════════════════════════════════════

POSTURE_GRADES: list[Tuple[float, str]] = [
    (90.0, "Excellent"),
    (85.0, "Très bon"),
    (75.0, "Bon"),
    (65.0, "Satisfaisant"),
    (55.0, "À améliorer"),
    (45.0, "Problèmes modérés"),
    (35.0, "Problèmes importants"),
    (0.0, "Problèmes sévères"),
]


def get_posture_grade(score: float) -> str:
    """Convertit un score postural (0-100) en grade textuel."""
    for threshold, grade in POSTURE_GRADES:
        if score >= threshold:
            return grade
    return "Problèmes sévères"
