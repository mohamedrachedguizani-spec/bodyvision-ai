"""
BodyVision AI — Moteur de Plan Fitness Intelligent & Personnalisé.

Ce module implémente un système de planification fitness avancé basé sur :
  • Périodisation ondulante (DUP) et linéaire selon le niveau
  • Programmation basée sur les données d'analyse corporelle (YOLO + MediaPipe)
  • Stratégie nutritionnelle individualisée (macro-cycling, timing nutritionnel)
  • Protocole de récupération scientifique (sommeil, HRV, mobilité)
  • Prévention des blessures et correction posturale intégrée
  • Objectifs SMART sur 3-6 mois avec jalons mesurables

Architecture :
  Le moteur calcule d'abord un « profil athlétique » complet à partir des
  données d'analyse, puis génère un plan multi-phases personnalisé.
  Chaque phase a des objectifs, un programme d'entraînement détaillé,
  une stratégie nutritionnelle et un protocole de récupération.
"""

import math
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta


# ══════════════════════════════════════════════════════════════
# CONSTANTES & TABLES DE RÉFÉRENCE
# ══════════════════════════════════════════════════════════════

# Coefficients d'activité pour le TDEE (Harris-Benedict révisé)
ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

# Plages de graisse corporelle optimales par sexe
OPTIMAL_BODY_FAT = {
    "male": {"athletic": (6, 13), "fitness": (14, 17), "average": (18, 24), "obese": (25, 100)},
    "female": {"athletic": (14, 20), "fitness": (21, 24), "average": (25, 31), "obese": (32, 100)},
}

# Ratio protéines (g/kg) selon l'objectif
PROTEIN_TARGETS = {
    "fat_loss": {"min": 2.0, "max": 2.4},
    "muscle_gain": {"min": 1.8, "max": 2.2},
    "recomposition": {"min": 2.0, "max": 2.5},
    "maintenance": {"min": 1.6, "max": 2.0},
    "posture_correction": {"min": 1.6, "max": 2.0},
    "athletic_performance": {"min": 1.8, "max": 2.2},
}

# Standards de force (ratios poids du corps) pour évaluer le niveau
STRENGTH_STANDARDS = {
    "male": {
        "beginner":     {"squat": 0.75, "bench": 0.60, "deadlift": 1.00, "ohp": 0.35},
        "intermediate": {"squat": 1.25, "bench": 1.00, "deadlift": 1.50, "ohp": 0.65},
        "advanced":     {"squat": 1.75, "bench": 1.35, "deadlift": 2.25, "ohp": 0.90},
    },
    "female": {
        "beginner":     {"squat": 0.50, "bench": 0.35, "deadlift": 0.75, "ohp": 0.25},
        "intermediate": {"squat": 1.00, "bench": 0.65, "deadlift": 1.25, "ohp": 0.45},
        "advanced":     {"squat": 1.50, "bench": 1.00, "deadlift": 1.75, "ohp": 0.70},
    },
}

# Jours de la semaine en français
DAYS_FR = {
    "monday": "Lundi",
    "tuesday": "Mardi",
    "wednesday": "Mercredi",
    "thursday": "Jeudi",
    "friday": "Vendredi",
    "saturday": "Samedi",
    "sunday": "Dimanche",
}


class FitnessPlanEngine:
    """
    Moteur de plan fitness intelligent.
    Génère un plan complet basé sur le profil athlétique de l'utilisateur.
    """

    # ──────────────────────────────────────────────────────────
    # 1. PROFIL ATHLÉTIQUE
    # ──────────────────────────────────────────────────────────

    def build_athletic_profile(
        self, user_data: Dict[str, Any], analysis_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Construit un profil athlétique complet à partir des données utilisateur
        et de l'analyse corporelle. C'est la base de toute la planification.
        """
        weight = float(user_data.get("weight", 70))
        height = float(user_data.get("height", 170))
        age = int(user_data.get("age", 30))
        sex = user_data.get("sex", "male").lower()
        activity_level = user_data.get("activity_level", "moderate")

        # Extraire les métriques de l'analyse
        composition = analysis_data.get("body_composition_complete", {})
        basic = composition.get("basic_metrics", {})
        fat_info = composition.get("fat_analysis", {})
        muscle_info = composition.get("muscle_analysis", {})
        posture = analysis_data.get("posture_analysis", {})

        bmi = self._safe_float(basic.get("bmi"), weight / ((height / 100) ** 2))
        body_fat_pct = self._safe_float(
            fat_info.get("body_fat_percentage"), self._estimate_body_fat(sex, age, bmi)
        )
        muscle_mass_kg = self._safe_float(muscle_info.get("skeletal_muscle_mass_kg"))
        lean_mass_kg = self._safe_float(muscle_info.get("lean_body_mass_kg"))
        posture_score = posture.get("posture_score", 75)
        posture_issues = posture.get("detected_issues", [])

        # Calculs dérivés
        bmr = self._calculate_bmr(sex, weight, height, age)
        tdee = round(bmr * ACTIVITY_MULTIPLIERS.get(activity_level, 1.55))
        fat_category = self._categorize_body_fat(sex, body_fat_pct)
        fitness_level = self._estimate_fitness_level(age, bmi, body_fat_pct, posture_score, sex)
        primary_goal = self._determine_primary_goal(
            sex, body_fat_pct, bmi, posture_score, muscle_mass_kg, weight, age
        )
        secondary_goals = self._determine_secondary_goals(
            primary_goal, posture_score, posture_issues, body_fat_pct, sex, age
        )

        fat_mass_kg = round(weight * body_fat_pct / 100, 1)
        if not lean_mass_kg:
            lean_mass_kg = round(weight - fat_mass_kg, 1)
        if not muscle_mass_kg:
            muscle_mass_kg = round(lean_mass_kg * (0.45 if sex == "male" else 0.36), 1)

        # Poids idéal estimé
        ideal_weight = self._calculate_ideal_weight(sex, height, age)
        weight_delta = round(weight - ideal_weight, 1)

        # Durée recommandée du programme
        program_duration_weeks = self._calculate_program_duration(primary_goal, abs(weight_delta), fitness_level)

        return {
            "user_metrics": {
                "weight_kg": weight,
                "height_cm": height,
                "age": age,
                "sex": sex,
                "bmi": round(bmi, 1),
                "activity_level": activity_level,
            },
            "body_composition": {
                "body_fat_percentage": round(body_fat_pct, 1),
                "body_fat_kg": fat_mass_kg,
                "lean_mass_kg": lean_mass_kg,
                "muscle_mass_kg": muscle_mass_kg,
                "fat_category": fat_category,
                "muscle_to_fat_ratio": round(muscle_mass_kg / max(fat_mass_kg, 0.1), 2),
            },
            "energy_metrics": {
                "bmr": round(bmr),
                "tdee": tdee,
                "activity_level": activity_level,
            },
            "posture_profile": {
                "score": posture_score,
                "grade": posture.get("posture_grade", "Moyen"),
                "issues_count": len(posture_issues),
                "critical_issues": [
                    i.get("issue", str(i)) for i in posture_issues
                    if isinstance(i, dict) and i.get("severity") in ("Élevée", "Critique")
                ],
                "needs_correction": posture_score < 70,
            },
            "fitness_assessment": {
                "level": fitness_level,
                "primary_goal": primary_goal,
                "secondary_goals": secondary_goals,
                "ideal_weight_kg": ideal_weight,
                "weight_delta_kg": weight_delta,
                "program_duration_weeks": program_duration_weeks,
            },
            "strength_targets": self._build_strength_targets(sex, weight, fitness_level),
        }

    # ──────────────────────────────────────────────────────────
    # 2. PLAN MULTI-PHASES
    # ──────────────────────────────────────────────────────────

    def generate_phases(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Génère les phases du programme avec objectifs, durée et description."""
        goal = profile["fitness_assessment"]["primary_goal"]
        level = profile["fitness_assessment"]["level"]
        total_weeks = profile["fitness_assessment"]["program_duration_weeks"]
        posture_needs = profile["posture_profile"]["needs_correction"]
        sex = profile["user_metrics"]["sex"]
        fat_pct = profile["body_composition"]["body_fat_percentage"]
        weight = profile["user_metrics"]["weight_kg"]
        delta = profile["fitness_assessment"]["weight_delta_kg"]

        phases: List[Dict[str, Any]] = []

        # ── Phase 0 (optionnelle) : Correction posturale ──
        if posture_needs:
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Fondation & Correction Posturale",
                "duration_weeks": 3,
                "icon": "🏗️",
                "color": "#FF9500",
                "objectives": [
                    "Corriger les déséquilibres posturaux identifiés",
                    "Renforcer les muscles stabilisateurs profonds",
                    "Établir des patterns de mouvement corrects",
                    "Améliorer la mobilité articulaire globale",
                ],
                "training_focus": "Correction posturale, mobilité, gainage",
                "intensity_range": "RPE 4-6 / Léger à modéré",
                "volume": "3-4 séances/semaine, 30-45 min",
                "key_indicators": [
                    "Score postural amélioré de 10+ points",
                    "Amplitude articulaire augmentée",
                    "Douleurs / tensions réduites",
                ],
                "training_split": "full_body_corrective",
                "deload_week": False,
            })

        # ── Phase d'adaptation ──
        if level == "beginner":
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Adaptation Neuromusculaire",
                "duration_weeks": 4,
                "icon": "🎯",
                "color": "#007AFF",
                "objectives": [
                    "Apprentissage technique des mouvements fondamentaux",
                    "Adaptation des tendons, ligaments et articulations",
                    "Développer l'endurance musculaire de base",
                    "Créer l'habitude d'entraînement régulier",
                ],
                "training_focus": "Technique, endurance musculaire, coordination",
                "intensity_range": "RPE 5-7 / Modéré",
                "volume": "3 séances/semaine, 40-50 min",
                "key_indicators": [
                    "Exécution technique correcte des 5 mouvements de base",
                    "Capacité à compléter les séances sans fatigue excessive",
                    "Progression des charges de 5-10%",
                ],
                "training_split": "full_body",
                "deload_week": False,
            })

        # ── Phase principale selon l'objectif ──
        if goal == "fat_loss":
            # Phase de déficit
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Perte de Graisse — Déficit Structuré",
                "duration_weeks": min(8, max(4, int(abs(delta) / 0.5))),
                "icon": "🔥",
                "color": "#FF3B30",
                "objectives": [
                    f"Réduire la masse grasse de {fat_pct:.0f}% vers {max(fat_pct - 5, 12 if sex == 'male' else 18):.0f}%",
                    f"Perdre {min(abs(delta), 6):.1f} kg de graisse en préservant la masse musculaire",
                    "Augmenter la dépense énergétique via NEAT + cardio stratégique",
                    "Optimiser la sensibilité à l'insuline",
                ],
                "training_focus": "Musculation + HIIT + Cardio basse intensité (LISS)",
                "intensity_range": "RPE 7-8 / Modéré à intense",
                "volume": "4-5 séances/semaine, 50-65 min",
                "key_indicators": [
                    "Perte de 0.5-1% du poids/semaine",
                    "Maintien ou augmentation des charges",
                    "Tour de taille réduit de 1-2 cm/mois",
                    "Énergie et humeur stables",
                ],
                "training_split": "upper_lower" if level != "beginner" else "full_body",
                "deload_week": True,
            })
            # Phase de consolidation
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Consolidation & Reverse Diet",
                "duration_weeks": 4,
                "icon": "⚖️",
                "color": "#34C759",
                "objectives": [
                    "Remonter progressivement les calories (+100 kcal/semaine)",
                    "Stabiliser le nouveau poids",
                    "Restaurer les niveaux hormonaux (leptine, thyroïde)",
                    "Renforcer les acquis musculaires",
                ],
                "training_focus": "Musculation hypertrophie, cardio modéré",
                "intensity_range": "RPE 7-8 / Modéré",
                "volume": "4 séances/semaine, 50-60 min",
                "key_indicators": [
                    "Poids stable ±0.5 kg/semaine",
                    "Progression des charges reprise",
                    "Métabolisme restauré",
                ],
                "training_split": "upper_lower",
                "deload_week": False,
            })

        elif goal == "muscle_gain":
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Hypertrophie — Volume Progressif",
                "duration_weeks": 6,
                "icon": "💪",
                "color": "#5856D6",
                "objectives": [
                    f"Augmenter la masse musculaire de {muscle_mass_kg:.0f} kg vers {muscle_mass_kg + 2:.0f} kg" 
                    if (muscle_mass_kg := profile["body_composition"]["muscle_mass_kg"]) else "Développer la masse musculaire",
                    "Surplus calorique contrôlé (+200-350 kcal/jour)",
                    "Atteindre 10-20 séries effectives par groupe musculaire/semaine",
                    "Progresser sur les mouvements composés de base",
                ],
                "training_focus": "Hypertrophie, surcharge progressive, volume élevé",
                "intensity_range": "RPE 7-9 / Intense",
                "volume": "4-5 séances/semaine, 55-75 min",
                "key_indicators": [
                    "Gain de 0.25-0.5 kg/semaine (max)",
                    "Progression sur les charges principales",
                    "Gain de force mesurable chaque mois",
                    "Amélioration visuelle (photos)",
                ],
                "training_split": "push_pull_legs" if level != "beginner" else "upper_lower",
                "deload_week": True,
            })
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Force & Densité Musculaire",
                "duration_weeks": 4,
                "icon": "🏆",
                "color": "#FF9500",
                "objectives": [
                    "Développer la force maximale sur les mouvements composés",
                    "Consolider les gains musculaires",
                    "Améliorer la connexion neuromusculaire",
                    "Préparer le prochain cycle d'hypertrophie",
                ],
                "training_focus": "Force, séries lourdes, repos longs",
                "intensity_range": "RPE 8-9.5 / Intense à très intense",
                "volume": "4 séances/semaine, 50-65 min",
                "key_indicators": [
                    "PR (records personnels) sur les mouvements de base",
                    "Maintien du poids corporel",
                    "Qualité musculaire améliorée",
                ],
                "training_split": "upper_lower",
                "deload_week": True,
            })

        elif goal == "recomposition":
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Recomposition Corporelle — Phase 1",
                "duration_weeks": 6,
                "icon": "🔄",
                "color": "#5856D6",
                "objectives": [
                    "Perdre de la graisse tout en gagnant du muscle simultanément",
                    "Calories au niveau maintenance ou léger déficit (-10%)",
                    "Haute intensité d'entraînement avec volume modéré",
                    "Macro-cycling: surplus jours d'entraînement, déficit jours de repos",
                ],
                "training_focus": "Musculation composée + HIIT",
                "intensity_range": "RPE 7-9 / Intense",
                "volume": "4 séances/semaine, 50-65 min",
                "key_indicators": [
                    "Poids stable mais composition changée",
                    "Tour de taille diminué, tour de bras augmenté",
                    "Force en augmentation",
                    "Apparence plus musclée et définie",
                ],
                "training_split": "upper_lower",
                "deload_week": True,
            })
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Recomposition — Phase Intensification",
                "duration_weeks": 6,
                "icon": "⚡",
                "color": "#FF9500",
                "objectives": [
                    "Intensifier la surcharge progressive",
                    "Affiner le physique avec techniques avancées",
                    "Optimiser le timing nutritionnel autour des entraînements",
                    "Consolider les changements de composition corporelle",
                ],
                "training_focus": "Hypertrophie + techniques d'intensité",
                "intensity_range": "RPE 8-9 / Intense",
                "volume": "4-5 séances/semaine, 55-70 min",
                "key_indicators": [
                    "Définition musculaire visible",
                    "Progression des charges continue",
                    "Ratio muscle/graisse amélioré",
                ],
                "training_split": "push_pull_legs",
                "deload_week": True,
            })

        elif goal == "posture_correction":
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Rééquilibrage Musculaire Profond",
                "duration_weeks": 6,
                "icon": "🧘",
                "color": "#34C759",
                "objectives": [
                    "Renforcer les muscles faibles identifiés",
                    "Étirer les muscles raccourcis",
                    "Améliorer le score postural de +20 points minimum",
                    "Intégrer des exercices correctifs au quotidien",
                ],
                "training_focus": "Correctifs posturaux, gainage, étirements ciblés",
                "intensity_range": "RPE 5-7 / Modéré",
                "volume": "4-5 séances/semaine (courtes), 30-45 min",
                "key_indicators": [
                    "Score postural amélioré",
                    "Réduction des douleurs/tensions",
                    "Meilleure amplitude articulaire",
                    "Alignement postural visible sur photos",
                ],
                "training_split": "full_body_corrective",
                "deload_week": False,
            })
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Renforcement Fonctionnel & Intégration",
                "duration_weeks": 6,
                "icon": "💪",
                "color": "#007AFF",
                "objectives": [
                    "Développer la force fonctionnelle",
                    "Maintenir les corrections posturales acquises",
                    "Commencer un programme de renforcement complet",
                    "Améliorer la condition physique générale",
                ],
                "training_focus": "Musculation fonctionnelle, stabilisation",
                "intensity_range": "RPE 6-8 / Modéré à intense",
                "volume": "4 séances/semaine, 45-55 min",
                "key_indicators": [
                    "Force fonctionnelle augmentée",
                    "Posture maintenue sous charge",
                    "Progression générale du conditionnement",
                ],
                "training_split": "upper_lower",
                "deload_week": True,
            })

        else:  # maintenance / athletic_performance
            phases.append({
                "phase_number": len(phases) + 1,
                "name": "Optimisation des Performances",
                "duration_weeks": 6,
                "icon": "🚀",
                "color": "#007AFF",
                "objectives": [
                    "Maintenir et optimiser la composition corporelle",
                    "Développer les capacités athlétiques (force, endurance, explosivité)",
                    "Prévenir les blessures par un travail de mobilité",
                    "Améliorer la qualité du mouvement",
                ],
                "training_focus": "Force, puissance, conditionnement",
                "intensity_range": "RPE 7-9 / Modéré à intense",
                "volume": "4-5 séances/semaine, 50-65 min",
                "key_indicators": [
                    "Records personnels améliorés",
                    "Composition corporelle maintenue",
                    "Capacité cardiovasculaire améliorée",
                ],
                "training_split": "upper_lower",
                "deload_week": True,
            })

        # ── Phase finale : Réévaluation ──
        phases.append({
            "phase_number": len(phases) + 1,
            "name": "Réévaluation & Nouveau Cycle",
            "duration_weeks": 1,
            "icon": "📊",
            "color": "#8E8E93",
            "objectives": [
                "Prendre de nouvelles photos et mesures avec BodyVision AI",
                "Comparer les résultats avec l'analyse initiale",
                "Identifier les progrès et axes d'amélioration",
                "Planifier le prochain cycle d'entraînement",
            ],
            "training_focus": "Récupération, tests, mesures",
            "intensity_range": "RPE 3-5 / Léger",
            "volume": "2-3 séances/semaine, 30 min",
            "key_indicators": [
                "Données comparatives obtenues",
                "Nouveau plan défini",
                "Récupération complète avant le prochain cycle",
            ],
            "training_split": "evaluation",
            "deload_week": True,
        })

        return phases

    # ──────────────────────────────────────────────────────────
    # 3. PROGRAMME D'ENTRAÎNEMENT DÉTAILLÉ PAR PHASE
    # ──────────────────────────────────────────────────────────

    def generate_weekly_program(
        self, profile: Dict[str, Any], phase: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Génère le programme hebdomadaire détaillé pour une phase donnée."""
        split = phase.get("training_split", "full_body")
        level = profile["fitness_assessment"]["level"]
        goal = profile["fitness_assessment"]["primary_goal"]
        sex = profile["user_metrics"]["sex"]
        posture_issues = profile["posture_profile"]["critical_issues"]

        programs = {
            "full_body": self._full_body_program,
            "full_body_corrective": self._corrective_program,
            "upper_lower": self._upper_lower_program,
            "push_pull_legs": self._ppl_program,
            "evaluation": self._evaluation_program,
        }

        builder = programs.get(split, self._full_body_program)
        weekly = builder(level, goal, sex, posture_issues)

        # Ajouter la progression
        weekly["progression_rules"] = self._get_progression_rules(level, goal)
        weekly["warmup_protocol"] = self._get_warmup_protocol(phase)
        weekly["cooldown_protocol"] = self._get_cooldown_protocol()

        return weekly

    # ──────────────────────────────────────────────────────────
    # 4. STRATÉGIE NUTRITIONNELLE COMPLÈTE
    # ──────────────────────────────────────────────────────────

    def generate_nutrition_strategy(
        self, profile: Dict[str, Any], phase: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Stratégie nutritionnelle individualisée et cyclique."""
        goal = profile["fitness_assessment"]["primary_goal"]
        tdee = profile["energy_metrics"]["tdee"]
        weight = profile["user_metrics"]["weight_kg"]
        sex = profile["user_metrics"]["sex"]
        age = profile["user_metrics"]["age"]
        fat_pct = profile["body_composition"]["body_fat_percentage"]
        lean_mass = profile["body_composition"]["lean_mass_kg"]

        # Cible calorique selon objectif et phase
        caloric_plan = self._calculate_caloric_targets(goal, tdee, weight, phase)

        # Macronutriments
        protein_range = PROTEIN_TARGETS.get(goal, PROTEIN_TARGETS["maintenance"])
        protein_g_per_kg = round((protein_range["min"] + protein_range["max"]) / 2, 1)
        protein_total = round(weight * protein_g_per_kg)
        protein_cal = protein_total * 4

        fat_g_per_kg = 0.9 if goal != "fat_loss" else 0.7
        fat_total = round(weight * fat_g_per_kg)
        fat_cal = fat_total * 9

        carb_cal = caloric_plan["training_day"] - protein_cal - fat_cal
        carb_total = max(round(carb_cal / 4), round(weight * 2))
        carb_g_per_kg = round(carb_total / weight, 1)

        # Macro-cycling (jours d'entraînement vs repos)
        rest_day_carb = round(carb_total * 0.7)
        rest_day_fat = round(fat_total * 1.1)
        rest_day_cal = protein_cal + (rest_day_carb * 4) + (rest_day_fat * 9)

        # Hydratation
        water_base = round(weight * 0.033, 1)  # 33ml/kg
        water_training = round(water_base + 0.5, 1)

        return {
            "caloric_strategy": {
                "tdee_estimated": f"{tdee} kcal",
                "training_day_target": f"{caloric_plan['training_day']} kcal",
                "rest_day_target": f"{rest_day_cal} kcal",
                "weekly_average": f"{round((caloric_plan['training_day'] * 4 + rest_day_cal * 3) / 7)} kcal",
                "deficit_or_surplus": caloric_plan["adjustment_label"],
                "adjustment_strategy": caloric_plan["adjustment_strategy"],
            },
            "macronutrients": {
                "protein": {
                    "grams_per_kg": f"{protein_g_per_kg} g/kg",
                    "daily_total": f"{protein_total} g/jour",
                    "calories": f"{protein_cal} kcal",
                    "percentage": f"{round(protein_cal / caloric_plan['training_day'] * 100)}%",
                    "timing": "Répartir en 4-5 prises de 25-40g, dont une prise péri-entraînement",
                    "best_sources": [
                        "Poulet / Dinde (30g prot/100g)",
                        "Poisson blanc & saumon (20-25g prot/100g)",
                        "Œufs entiers (13g prot/2 œufs)",
                        "Whey protein (25g prot/dose)",
                        "Légumineuses (lentilles, pois chiches)",
                        "Fromage blanc 0% (12g prot/100g)",
                    ],
                },
                "carbohydrates": {
                    "grams_per_kg": f"{carb_g_per_kg} g/kg",
                    "training_day": f"{carb_total} g",
                    "rest_day": f"{rest_day_carb} g",
                    "calories": f"{carb_total * 4} kcal",
                    "percentage": f"{round(carb_total * 4 / caloric_plan['training_day'] * 100)}%",
                    "timing": "Concentrer 60% autour de l'entraînement (avant/pendant/après)",
                    "best_sources": [
                        "Riz basmati / complet",
                        "Patate douce",
                        "Avoine / Flocons d'avoine",
                        "Fruits (banane, pomme, baies)",
                        "Quinoa",
                        "Pain complet / Pâtes complètes",
                    ],
                },
                "fats": {
                    "grams_per_kg": f"{fat_g_per_kg} g/kg",
                    "daily_total": f"{fat_total} g",
                    "rest_day": f"{rest_day_fat} g",
                    "calories": f"{fat_cal} kcal",
                    "percentage": f"{round(fat_cal / caloric_plan['training_day'] * 100)}%",
                    "timing": "Éloigner des entraînements, favoriser aux repas principaux",
                    "best_sources": [
                        "Huile d'olive extra vierge",
                        "Avocat",
                        "Noix & amandes (une poignée/jour)",
                        "Poissons gras (saumon, maquereau, sardines)",
                        "Graines de lin / chia",
                        "Beurre de cacahuète naturel",
                    ],
                },
            },
            "meal_plan_template": {
                "meal_1_petit_dejeuner": {
                    "timing": "7h00 - 8h00",
                    "composition": f"Protéines ({round(protein_total * 0.25)}g) + Glucides complexes + Graisses saines",
                    "example": "Flocons d'avoine + whey + fruits rouges + noix",
                },
                "meal_2_collation": {
                    "timing": "10h00 - 10h30",
                    "composition": f"Protéines ({round(protein_total * 0.15)}g) + Fruit",
                    "example": "Fromage blanc + pomme ou banane",
                },
                "meal_3_dejeuner": {
                    "timing": "12h30 - 13h30",
                    "composition": f"Protéines ({round(protein_total * 0.30)}g) + Glucides + Légumes + Graisses",
                    "example": "Poulet + riz + légumes variés + huile d'olive",
                },
                "meal_4_pre_entrainement": {
                    "timing": "1h-1h30 avant l'entraînement",
                    "composition": "Glucides rapides + Protéines légères",
                    "example": "Banane + quelques amandes ou shake protéiné léger",
                },
                "meal_5_post_entrainement": {
                    "timing": "Dans les 45 min post-entraînement",
                    "composition": f"Protéines rapides ({round(protein_total * 0.20)}g) + Glucides rapides",
                    "example": "Whey + banane + miel ou barre protéinée",
                },
                "meal_6_diner": {
                    "timing": "19h00 - 20h30",
                    "composition": f"Protéines ({round(protein_total * 0.25)}g) + Légumes + Graisses",
                    "example": "Saumon + légumes grillés + avocat",
                },
            },
            "hydration_protocol": {
                "minimum_daily": f"{water_base} L",
                "training_days": f"{water_training} L",
                "pre_workout": "500 ml dans les 2h précédentes",
                "during_workout": "150-200 ml toutes les 15 min",
                "post_workout": "500 ml dans l'heure suivante",
                "tips": [
                    "Viser une urine claire à légèrement jaune",
                    "Boire dès le réveil (300-500 ml)",
                    "Ajouter une pincée de sel si transpiration excessive",
                ],
            },
            "supplementation": {
                "essential": [
                    {"name": "Vitamine D3", "dose": "2000-4000 UI/jour", "timing": "Avec un repas gras", "reason": "Santé osseuse, immunité, hormones"},
                    {"name": "Oméga-3 (EPA/DHA)", "dose": "2-3g/jour", "timing": "Avec les repas", "reason": "Anti-inflammatoire, santé cardiovasculaire"},
                    {"name": "Magnésium bisglycinate", "dose": "300-400 mg/jour", "timing": "Le soir", "reason": "Récupération, sommeil, crampes"},
                ],
                "performance": [
                    {"name": "Créatine monohydrate", "dose": "3-5g/jour", "timing": "Avec le repas post-entraînement", "reason": "Force, puissance, récupération"},
                    {"name": "Whey protein", "dose": "25-30g/dose", "timing": "Post-entraînement", "reason": "Synthèse protéique musculaire"},
                    {"name": "Caféine", "dose": "100-200 mg", "timing": "30 min avant l'entraînement", "reason": "Performance, focus (optionnel)"},
                ],
                "conditonal": self._get_conditional_supplements(sex, age, fat_pct),
            },
            "foods_to_limit": [
                "Sucres ajoutés et boissons sucrées",
                "Aliments ultra-transformés",
                "Alcool (limite: max 2 verres/semaine)",
                "Graisses trans et huiles hydrogénées",
                "Excès de sel (max 6g/jour)",
            ],
        }

    # ──────────────────────────────────────────────────────────
    # 5. PROTOCOLE DE RÉCUPÉRATION
    # ──────────────────────────────────────────────────────────

    def generate_recovery_protocol(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Protocole de récupération scientifique et personnalisé."""
        age = profile["user_metrics"]["age"]
        level = profile["fitness_assessment"]["level"]

        sleep_hours = "8-9" if age < 25 else ("7-8.5" if age < 45 else "7-8")

        return {
            "sleep_optimization": {
                "target_duration": f"{sleep_hours} heures/nuit",
                "sleep_score_target": "85+/100",
                "circadian_rhythm": {
                    "wake_time": "6h30 - 7h00 (constant même le week-end)",
                    "sleep_time": "22h00 - 23h00",
                    "pre_sleep_routine": "Début 1h avant le coucher",
                },
                "environment": [
                    "Température: 18-20°C (fraîche)",
                    "Obscurité totale (masque de sommeil si nécessaire)",
                    "Silence ou bruit blanc constant",
                    "Literie de qualité, oreiller adapté",
                ],
                "pre_sleep_protocol": [
                    "Pas d'écrans 60 min avant (ou filtre lumière bleue)",
                    "Lecture, méditation, ou respiration 4-7-8",
                    "Magnésium bisglycinate 300mg (30 min avant)",
                    "Infusion camomille ou passiflore",
                    "Étirements doux 5-10 min",
                ],
                "post_wake_protocol": [
                    "Exposition lumière naturelle dans les 30 min",
                    "Hydratation immédiate (300-500 ml eau)",
                    "Mobilité articulaire légère 5 min",
                ],
            },
            "active_recovery": {
                "frequency": "2-3 fois/semaine (jours off)",
                "activities": [
                    {"activity": "Marche en nature", "duration": "30-45 min", "intensity": "Faible (zone 1-2)"},
                    {"activity": "Yoga restauratif / Yin yoga", "duration": "30-40 min", "intensity": "Très faible"},
                    {"activity": "Natation légère", "duration": "20-30 min", "intensity": "Faible"},
                    {"activity": "Vélo léger", "duration": "20-30 min", "intensity": "Zone 1-2"},
                    {"activity": "Rouleau de massage (foam rolling)", "duration": "15-20 min", "intensity": "Auto-massage"},
                ],
                "guidelines": "Ne pas dépasser 60% de la FC max. L'objectif est la circulation sanguine, pas la performance.",
            },
            "mobility_program": {
                "daily_minimum": {
                    "duration": "10-15 min",
                    "exercises": [
                        "Rotations cervicales (10 chaque sens)",
                        "Cercles d'épaules (10 avant/arrière)",
                        "Cat-cow / Chat-vache (10 reps)",
                        "90/90 hip stretch (30s chaque côté)",
                        "World's greatest stretch (5 chaque côté)",
                        "Squat profond maintenu (30-60s)",
                    ],
                },
                "pre_workout": {
                    "duration": "8-12 min",
                    "protocol": [
                        "Foam rolling ciblé (3-5 min)",
                        "Activation musculaire (band pull-aparts, glute bridges)",
                        "Mobilité articulaire dynamique",
                        "Séries d'échauffement progressives du premier exercice",
                    ],
                },
                "post_workout": {
                    "duration": "8-10 min",
                    "protocol": [
                        "Étirements statiques des muscles travaillés (30s/muscle)",
                        "Respiration diaphragmatique (2 min)",
                        "Hanging passif (décompression vertébrale) si possible",
                    ],
                },
            },
            "stress_management": {
                "daily_practices": [
                    {"practice": "Respiration Box (4-4-4-4)", "duration": "5 min", "timing": "Matin + Soir"},
                    {"practice": "Méditation guidée (Headspace, Petit Bambou)", "duration": "10 min", "timing": "Matin"},
                    {"practice": "Journaling / Gratitude", "duration": "5 min", "timing": "Soir"},
                ],
                "weekly_practices": [
                    {"practice": "Bain froid / douche froide (2-5 min)", "frequency": "2-3x/semaine", "benefit": "Réduction inflammation, résilience mentale"},
                    {"practice": "Exposition nature (bain de forêt)", "frequency": "1-2x/semaine", "benefit": "Réduction cortisol, bien-être"},
                    {"practice": "Déconnexion digitale", "frequency": "1x/semaine (quelques heures)", "benefit": "Repos cognitif"},
                ],
                "red_flags": [
                    "Fatigue persistante malgré bon sommeil → réduire volume d'entraînement",
                    "Irritabilité accrue → vérifier nutrition et repos",
                    "Insomnie > 3 nuits → consulter un professionnel",
                    "Douleurs articulaires constantes → adapter les exercices",
                ],
            },
            "injury_prevention": {
                "principles": [
                    "Toujours s'échauffer avant l'effort (5-10 min minimum)",
                    "Respecter la technique avant la charge",
                    "Écouter les signaux du corps : distinguer douleur et inconfort",
                    "Semaine de décharge (deload) toutes les 4-6 semaines",
                    "Varier les exercices pour éviter les micro-traumatismes répétés",
                ],
                "prehab_exercises": [
                    {"target": "Épaules", "exercises": ["Face pulls (3x15)", "Rotations externes (3x12)", "Band pull-aparts (3x20)"]},
                    {"target": "Genoux", "exercises": ["Terminal knee extensions (3x15)", "Step-ups légers", "Isométrie quad (wall sit 30-45s)"]},
                    {"target": "Dos", "exercises": ["Bird-dogs (3x10/côté)", "Dead bugs (3x10/côté)", "Back extensions légères (3x12)"]},
                    {"target": "Hanches", "exercises": ["Clam shells (3x15/côté)", "Hip circles (10/sens)", "Single leg glute bridges (3x12/côté)"]},
                ],
                "when_to_stop": [
                    "Douleur aiguë ou soudaine pendant un exercice",
                    "Gonflement ou inflammation visible",
                    "Limitation de l'amplitude de mouvement",
                    "Douleur qui s'intensifie au lieu de diminuer",
                ],
            },
            "recovery_metrics": {
                "daily_check": [
                    "Qualité du sommeil (1-10)",
                    "Niveau d'énergie au réveil (1-10)",
                    "Douleurs musculaires (DOMS) (1-10)",
                    "Humeur générale (1-10)",
                ],
                "weekly_check": [
                    "Poids corporel (même heure, même conditions)",
                    "Performance à l'entraînement (progression ou régression)",
                    "Photos de suivi (même éclairage, même angle)",
                ],
                "monthly_check": [
                    "Tour de taille, hanches, bras, cuisses",
                    "Nouvelle analyse BodyVision AI recommandée",
                    "Évaluation subjective des progrès",
                ],
            },
        }

    # ──────────────────────────────────────────────────────────
    # 6. OBJECTIFS SMART
    # ──────────────────────────────────────────────────────────

    def generate_smart_goals(self, profile: Dict[str, Any], phases: List[Dict]) -> Dict[str, Any]:
        """Génère des objectifs SMART sur la durée du programme."""
        goal = profile["fitness_assessment"]["primary_goal"]
        weight = profile["user_metrics"]["weight_kg"]
        fat_pct = profile["body_composition"]["body_fat_percentage"]
        muscle_mass = profile["body_composition"]["muscle_mass_kg"]
        posture_score = profile["posture_profile"]["score"]
        sex = profile["user_metrics"]["sex"]
        ideal_weight = profile["fitness_assessment"]["ideal_weight_kg"]
        total_weeks = sum(p["duration_weeks"] for p in phases)

        goals = {
            "program_duration": f"{total_weeks} semaines ({round(total_weeks / 4.3, 1)} mois)",
            "start_date": datetime.now().strftime("%d/%m/%Y"),
            "target_end_date": (datetime.now() + timedelta(weeks=total_weeks)).strftime("%d/%m/%Y"),
        }

        # Objectifs composition corporelle
        if goal == "fat_loss":
            target_fat = max(fat_pct - min(8, fat_pct * 0.25), 10 if sex == "male" else 16)
            target_weight = max(weight - min(10, abs(weight - ideal_weight)), ideal_weight * 0.95)
            goals["body_composition_goals"] = {
                "body_fat_start": f"{fat_pct}%",
                "body_fat_target": f"{round(target_fat, 1)}%",
                "weight_start": f"{weight} kg",
                "weight_target": f"{round(target_weight, 1)} kg",
                "muscle_mass_target": f"Maintenir ≥ {round(muscle_mass * 0.95, 1)} kg",
                "waist_reduction_target": "Réduire de 3-6 cm",
            }
        elif goal == "muscle_gain":
            muscle_gain_potential = 0.5 * (total_weeks / 4)  # ~0.5kg/mois pour débutant
            goals["body_composition_goals"] = {
                "muscle_mass_start": f"{muscle_mass} kg",
                "muscle_mass_target": f"{round(muscle_mass + muscle_gain_potential, 1)} kg",
                "weight_target": f"{round(weight + muscle_gain_potential * 1.5, 1)} kg (gain contrôlé)",
                "body_fat_target": f"Maintenir ≤ {round(fat_pct + 2, 1)}%",
                "strength_increase_target": "+15-25% sur les mouvements composés",
            }
        elif goal == "recomposition":
            goals["body_composition_goals"] = {
                "body_fat_target": f"Réduire de {fat_pct}% vers {round(fat_pct - 3, 1)}%",
                "muscle_mass_target": f"Augmenter de {muscle_mass} kg vers {round(muscle_mass + 1.5, 1)} kg",
                "weight_target": f"Stable ± 2 kg ({round(weight - 1, 1)} - {round(weight + 1, 1)} kg)",
                "visual_target": "Amélioration visible de la définition musculaire",
            }
        else:
            goals["body_composition_goals"] = {
                "posture_score_target": f"Améliorer de {posture_score} vers {min(posture_score + 20, 95)}",
                "maintain_weight": f"Maintenir ± 2 kg autour de {weight} kg",
                "functional_strength": "Amélioration mesurable de la force fonctionnelle",
            }

        # Objectifs de force
        targets = profile.get("strength_targets", {})
        goals["strength_goals"] = {
            "month_1": "Maîtriser la technique des mouvements de base",
            "month_2": f"Atteindre les standards débutant ({targets.get('beginner', {})})",
            "month_3_plus": f"Progresser vers les standards intermédiaires ({targets.get('intermediate', {})})",
        }

        # Objectifs posturaux
        goals["posture_goals"] = {
            "current_score": f"{posture_score}/100",
            "target_score": f"{min(posture_score + 15, 95)}/100",
            "target_timeline": "Amélioration progressive sur toute la durée du programme",
        }

        # Objectifs habitudes de vie
        goals["lifestyle_goals"] = {
            "sleep": "7-9h de sommeil de qualité par nuit",
            "hydration": f"Minimum {round(weight * 0.033, 1)} L d'eau/jour",
            "steps": "8 000 - 10 000 pas/jour minimum",
            "stress": "Pratiquer au moins 1 technique de gestion du stress/jour",
            "nutrition_adherence": "Suivre le plan nutritionnel 80-90% du temps",
        }

        # Jalons mensuels
        goals["monthly_milestones"] = []
        for month in range(1, math.ceil(total_weeks / 4) + 1):
            milestone = {
                "month": month,
                "title": f"Mois {month}",
                "checkpoints": self._get_monthly_checkpoints(month, goal, profile),
            }
            goals["monthly_milestones"].append(milestone)

        return goals

    # ──────────────────────────────────────────────────────────
    # 7. MONITORING & AJUSTEMENTS
    # ──────────────────────────────────────────────────────────

    def generate_monitoring_plan(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Plan de suivi et règles d'ajustement automatiques."""
        goal = profile["fitness_assessment"]["primary_goal"]

        return {
            "tracking_metrics": {
                "daily": [
                    {"metric": "Poids corporel", "method": "Balance le matin à jeun", "frequency": "Quotidien"},
                    {"metric": "Qualité du sommeil", "method": "Score subjectif 1-10", "frequency": "Quotidien"},
                    {"metric": "Niveau d'énergie", "method": "Score subjectif 1-10", "frequency": "Quotidien"},
                    {"metric": "Apport calorique", "method": "App de suivi (MyFitnessPal)", "frequency": "Quotidien"},
                ],
                "weekly": [
                    {"metric": "Moyenne de poids", "method": "Moyenne des 7 pesées", "frequency": "Hebdomadaire"},
                    {"metric": "Performance entraînement", "method": "Charges / reps / RPE", "frequency": "À chaque séance"},
                    {"metric": "Photos de progression", "method": "Même éclairage, angle, heure", "frequency": "Hebdomadaire"},
                    {"metric": "Tour de taille", "method": "Au nombril, le matin", "frequency": "Hebdomadaire"},
                ],
                "monthly": [
                    {"metric": "Analyse BodyVision AI", "method": "Nouvelle analyse complète", "frequency": "Mensuel"},
                    {"metric": "Mensurations complètes", "method": "Poitrine, bras, cuisses, hanches", "frequency": "Mensuel"},
                    {"metric": "Tests de force", "method": "1RM estimé ou 5RM sur les mouvements clés", "frequency": "Mensuel"},
                    {"metric": "Bilan bien-être", "method": "Évaluation globale énergie, humeur, motivation", "frequency": "Mensuel"},
                ],
            },
            "adjustment_rules": self._get_adjustment_rules(goal),
            "deload_protocol": {
                "frequency": "1 semaine toutes les 4-6 semaines d'entraînement intense",
                "volume_reduction": "Réduire le volume de 40-50%",
                "intensity_reduction": "Maintenir l'intensité mais réduire les séries",
                "purpose": [
                    "Récupération des tissus conjonctifs (tendons, ligaments)",
                    "Restauration du système nerveux central",
                    "Resensibilisation à l'entraînement",
                    "Prévention du surentraînement",
                ],
                "signs_deload_needed": [
                    "Stagnation ou régression sur 2+ semaines",
                    "Fatigue accumulée malgré bon sommeil",
                    "Douleurs articulaires persistantes",
                    "Perte de motivation significative",
                    "Sommeil perturbé de manière chronique",
                ],
            },
            "when_to_reassess": [
                "À la fin de chaque phase du programme",
                "Si les indicateurs de progression stagnent >3 semaines",
                "Après une blessure ou maladie",
                "En cas de changement majeur de mode de vie",
            ],
        }

    # ══════════════════════════════════════════════════════════
    # MÉTHODES PRIVÉES — CALCULS & HELPERS
    # ══════════════════════════════════════════════════════════

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        """Convertit une valeur en float de manière sûre."""
        if value is None:
            return default
        try:
            cleaned = str(value).replace("%", "").replace("kg", "").replace("cm", "").strip()
            return float(cleaned)
        except (ValueError, TypeError):
            return default

    def _calculate_bmr(self, sex: str, weight: float, height: float, age: int) -> float:
        """BMR avec l'équation de Mifflin-St Jeor (la plus précise)."""
        if sex == "male":
            return 10 * weight + 6.25 * height - 5 * age + 5
        return 10 * weight + 6.25 * height - 5 * age - 161

    def _estimate_body_fat(self, sex: str, age: int, bmi: float) -> float:
        """Estimation de la graisse corporelle à partir du BMI (formule Deurenberg)."""
        if sex == "male":
            return 1.20 * bmi + 0.23 * age - 16.2
        return 1.20 * bmi + 0.23 * age - 5.4

    def _categorize_body_fat(self, sex: str, fat_pct: float) -> str:
        ranges = OPTIMAL_BODY_FAT.get(sex, OPTIMAL_BODY_FAT["male"])
        if fat_pct <= ranges["athletic"][1]:
            return "Athlétique"
        if fat_pct <= ranges["fitness"][1]:
            return "Fitness"
        if fat_pct <= ranges["average"][1]:
            return "Moyen"
        return "Surpoids/Obèse"

    def _estimate_fitness_level(
        self, age: int, bmi: float, fat_pct: float, posture_score: int, sex: str
    ) -> str:
        score = 0
        # BMI scoring
        if 18.5 <= bmi <= 24.9:
            score += 3
        elif 25 <= bmi <= 29.9:
            score += 1
        # Body fat scoring
        optimal = OPTIMAL_BODY_FAT[sex]
        if fat_pct <= optimal["fitness"][1]:
            score += 3
        elif fat_pct <= optimal["average"][1]:
            score += 1
        # Posture scoring
        if posture_score >= 80:
            score += 3
        elif posture_score >= 60:
            score += 1
        # Age factor
        if age < 30:
            score += 1

        if score >= 8:
            return "advanced"
        if score >= 4:
            return "intermediate"
        return "beginner"

    def _determine_primary_goal(
        self,
        sex: str,
        fat_pct: float,
        bmi: float,
        posture_score: int,
        muscle_mass: float,
        weight: float,
        age: int,
    ) -> str:
        # Priorité 1 : Posture critique
        if posture_score < 55:
            return "posture_correction"

        # Priorité 2 : Surpoids/Obésité
        if bmi >= 30 or fat_pct > (30 if sex == "male" else 38):
            return "fat_loss"
        if bmi >= 27 or fat_pct > (25 if sex == "male" else 33):
            return "fat_loss"

        # Priorité 3 : Insuffisance pondérale
        if bmi < 18.5 or fat_pct < (8 if sex == "male" else 14):
            return "muscle_gain"

        # Priorité 4 : Composition moyenne
        muscle_ratio = muscle_mass / max(weight, 1)
        if muscle_ratio < (0.35 if sex == "male" else 0.28):
            return "muscle_gain"

        # Priorité 5 : Recomposition si entre les deux
        if fat_pct > (18 if sex == "male" else 25):
            return "recomposition"

        return "maintenance"

    def _determine_secondary_goals(
        self,
        primary: str,
        posture_score: int,
        posture_issues: list,
        fat_pct: float,
        sex: str,
        age: int,
    ) -> List[str]:
        goals = []
        if posture_score < 75 and primary != "posture_correction":
            goals.append("Amélioration posturale")
        if age > 40:
            goals.append("Prévention des blessures")
            goals.append("Maintien de la densité osseuse")
        if primary != "fat_loss" and fat_pct > (20 if sex == "male" else 28):
            goals.append("Optimisation de la composition corporelle")
        goals.append("Amélioration de la mobilité et flexibilité")
        goals.append("Développement de l'endurance cardiovasculaire")
        return goals[:4]

    def _calculate_ideal_weight(self, sex: str, height: float, age: int) -> float:
        """Formule de Devine + ajustement âge."""
        height_inch = height / 2.54
        if sex == "male":
            ideal = 50 + 2.3 * (height_inch - 60)
        else:
            ideal = 45.5 + 2.3 * (height_inch - 60)
        if age > 50:
            ideal *= 1.05
        return round(ideal, 1)

    def _calculate_program_duration(self, goal: str, weight_delta: float, level: str) -> int:
        base = {"fat_loss": 16, "muscle_gain": 16, "recomposition": 16, "posture_correction": 14, "maintenance": 12}
        duration = base.get(goal, 12)
        if weight_delta > 10:
            duration += 4
        if level == "beginner":
            duration += 4
        return min(duration, 24)

    def _build_strength_targets(self, sex: str, weight: float, level: str) -> Dict:
        standards = STRENGTH_STANDARDS.get(sex, STRENGTH_STANDARDS["male"])
        result = {}
        for lvl, lifts in standards.items():
            result[lvl] = {k: f"{round(v * weight, 1)} kg" for k, v in lifts.items()}
        return result

    def _calculate_caloric_targets(
        self, goal: str, tdee: int, weight: float, phase: Dict
    ) -> Dict[str, Any]:
        if goal == "fat_loss":
            deficit = round(tdee * 0.20)  # 20% deficit
            return {
                "training_day": tdee - deficit,
                "adjustment_label": f"Déficit de ~{deficit} kcal/jour (-20%)",
                "adjustment_strategy": "Réduire de 100 kcal/semaine si la perte stagne. Ne pas descendre sous le BMR.",
            }
        if goal == "muscle_gain":
            surplus = round(tdee * 0.12)  # 12% surplus (lean bulk)
            return {
                "training_day": tdee + surplus,
                "adjustment_label": f"Surplus contrôlé de ~{surplus} kcal/jour (+12%)",
                "adjustment_strategy": "Si gain > 0.5 kg/semaine, réduire de 100 kcal. Si pas de gain en 2 semaines, ajouter 100 kcal.",
            }
        if goal == "recomposition":
            return {
                "training_day": tdee + 100,
                "adjustment_label": "Légèrement au-dessus du maintien les jours d'entraînement",
                "adjustment_strategy": "Macro-cycling : +200 kcal jours d'entraînement, -200 kcal jours de repos.",
            }
        # Maintenance / posture
        return {
            "training_day": tdee,
            "adjustment_label": "Maintien calorique",
            "adjustment_strategy": "Ajuster ±100 kcal selon le niveau d'énergie et la performance.",
        }

    def _get_conditional_supplements(self, sex: str, age: int, fat_pct: float) -> List[Dict]:
        supps = []
        if sex == "female":
            supps.append({"name": "Fer", "dose": "14-18 mg/jour", "condition": "Si menstruations abondantes", "reason": "Prévention anémie"})
        if age > 40:
            supps.append({"name": "Collagène", "dose": "10-15g/jour", "condition": "Santé articulaire", "reason": "Articulations et tendons"})
            supps.append({"name": "Coenzyme Q10", "dose": "100-200mg/jour", "condition": "Énergie et récupération", "reason": "Production d'énergie cellulaire"})
        if fat_pct > 25:
            supps.append({"name": "Fibres (psyllium)", "dose": "5-10g/jour", "condition": "Contrôle appétit", "reason": "Satiété et santé digestive"})
        return supps

    # ── Programmes d'entraînement ──

    def _full_body_program(self, level, goal, sex, issues):
        return {
            "split_type": "Full Body (3 jours)",
            "days": {
                "monday": {
                    "name": "Full Body A — Force",
                    "focus": "Mouvements composés — Force",
                    "exercises": [
                        {"name": "Back Squat", "sets": "4", "reps": "6-8", "rest": "2-3 min", "notes": "Descendre au parallèle minimum"},
                        {"name": "Développé couché (barre)", "sets": "4", "reps": "6-8", "rest": "2-3 min", "notes": "Contrôler la descente"},
                        {"name": "Rowing barre (pronation)", "sets": "3", "reps": "8-10", "rest": "90s", "notes": "Dos droit, serrer les omoplates"},
                        {"name": "Développé militaire haltères", "sets": "3", "reps": "8-10", "rest": "90s", "notes": "Pas de triche"},
                        {"name": "Planche (gainage)", "sets": "3", "reps": "30-45s", "rest": "60s", "notes": "Corps aligné"},
                        {"name": "Face pulls (poulie)", "sets": "3", "reps": "15-20", "rest": "60s", "notes": "Santé des épaules"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "50-60 min",
                },
                "tuesday": {
                    "name": "Récupération Active",
                    "focus": "Cardio léger + Mobilité",
                    "exercises": [
                        {"name": "Marche rapide ou vélo", "sets": "-", "reps": "25-35 min", "rest": "-", "notes": "Zone 2 (conversation possible)"},
                        {"name": "Routine mobilité complète", "sets": "-", "reps": "15 min", "rest": "-", "notes": "Voir protocole mobilité"},
                        {"name": "Foam rolling", "sets": "-", "reps": "10 min", "rest": "-", "notes": "Focus muscles sollicités la veille"},
                    ],
                    "intensity": "RPE 3-4",
                    "duration": "45-55 min",
                },
                "wednesday": {
                    "name": "Full Body B — Hypertrophie",
                    "focus": "Volume & connexion musculaire",
                    "exercises": [
                        {"name": "Fentes marchées (haltères)", "sets": "3", "reps": "10-12/jambe", "rest": "90s", "notes": "Grand pas, genou arrière frôle le sol"},
                        {"name": "Développé incliné haltères", "sets": "3", "reps": "10-12", "rest": "90s", "notes": "Amplitude complète"},
                        {"name": "Tirage vertical (poulie)", "sets": "3", "reps": "10-12", "rest": "90s", "notes": "Tirer vers la poitrine"},
                        {"name": "Élévations latérales", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contrôle + squeeze"},
                        {"name": "Curl biceps + Extension triceps", "sets": "3", "reps": "12-15 (superset)", "rest": "60s", "notes": "Supersets pour efficacité"},
                        {"name": "Crunchs câble + Leg raises", "sets": "3", "reps": "12-15 (superset)", "rest": "60s", "notes": "Abdos complets"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "50-60 min",
                },
                "thursday": {
                    "name": "Repos Complet ou Cardio Léger",
                    "focus": "Régénération",
                    "exercises": [
                        {"name": "Repos complet", "sets": "-", "reps": "-", "rest": "-", "notes": "OU marche légère 20-30 min"},
                        {"name": "Étirements passifs", "sets": "-", "reps": "10-15 min", "rest": "-", "notes": "Focus hanches et épaules"},
                    ],
                    "intensity": "RPE 1-3",
                    "duration": "0-30 min",
                },
                "friday": {
                    "name": "Full Body C — Puissance & Endurance",
                    "focus": "Explosivité + circuit final",
                    "exercises": [
                        {"name": "Soulevé de terre roumain", "sets": "4", "reps": "6-8", "rest": "2-3 min", "notes": "Hanches en arrière, dos droit"},
                        {"name": "Dips (ou assistés)", "sets": "3", "reps": "8-10", "rest": "90s", "notes": "Amplitude contrôlée"},
                        {"name": "Tractions (ou assistées)", "sets": "3", "reps": "6-10", "rest": "2 min", "notes": "Supination ou pronation"},
                        {"name": "Goblet squat", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Profondeur maximale"},
                        {"name": "Circuit finisher", "sets": "3 rounds", "reps": "30s travail / 15s repos", "rest": "2 min entre rounds", "notes": "Burpees, mountain climbers, jumping jacks"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "50-60 min",
                },
                "saturday": {
                    "name": "Activité Récréative",
                    "focus": "Cardio plaisir + Core",
                    "exercises": [
                        {"name": "Sport/activité au choix", "sets": "-", "reps": "30-45 min", "rest": "-", "notes": "Natation, vélo, randonnée, sport collectif..."},
                        {"name": "Circuit abdos (optionnel)", "sets": "3 rounds", "reps": "10-12 par exo", "rest": "30s", "notes": "Planche, russian twists, bicycle crunches"},
                    ],
                    "intensity": "RPE 5-7",
                    "duration": "30-50 min",
                },
                "sunday": {
                    "name": "Repos Complet",
                    "focus": "Régénération totale",
                    "exercises": [
                        {"name": "Repos total", "sets": "-", "reps": "-", "rest": "-", "notes": "Priorité au sommeil, à la nutrition et au bien-être mental"},
                        {"name": "Mobilité douce (optionnel)", "sets": "-", "reps": "10 min", "rest": "-", "notes": "Yoga, étirements doux"},
                    ],
                    "intensity": "RPE 1-2",
                    "duration": "0-15 min",
                },
            },
        }

    def _corrective_program(self, level, goal, sex, issues):
        return {
            "split_type": "Correctif Postural (4 jours)",
            "days": {
                "monday": {
                    "name": "Mobilité & Activation",
                    "focus": "Débloquer les articulations raides + activer les muscles inhibés",
                    "exercises": [
                        {"name": "Cat-Cow (Chat-Vache)", "sets": "3", "reps": "10", "rest": "30s", "notes": "Mouvement lent et contrôlé"},
                        {"name": "90/90 Hip Stretch", "sets": "2", "reps": "30s/côté", "rest": "15s", "notes": "Ouvrir les hanches"},
                        {"name": "Wall Angels", "sets": "3", "reps": "10", "rest": "30s", "notes": "Dos contre le mur"},
                        {"name": "Dead Bugs", "sets": "3", "reps": "8/côté", "rest": "30s", "notes": "Bas du dos plaqué au sol"},
                        {"name": "Glute Bridges", "sets": "3", "reps": "12", "rest": "45s", "notes": "Serrer les fessiers en haut"},
                        {"name": "Band Pull-Aparts", "sets": "3", "reps": "15", "rest": "30s", "notes": "Omoplates serrées"},
                    ],
                    "intensity": "RPE 4-5",
                    "duration": "35-40 min",
                },
                "tuesday": {
                    "name": "Renforcement Stabilisateurs",
                    "focus": "Core profond, stabilisateurs de hanche et épaules",
                    "exercises": [
                        {"name": "Pallof Press", "sets": "3", "reps": "10/côté", "rest": "45s", "notes": "Anti-rotation du tronc"},
                        {"name": "Bird Dogs", "sets": "3", "reps": "8/côté", "rest": "30s", "notes": "Lent et contrôlé"},
                        {"name": "Side Plank", "sets": "3", "reps": "20-30s/côté", "rest": "30s", "notes": "Corps aligné"},
                        {"name": "Clamshells (élastique)", "sets": "3", "reps": "12/côté", "rest": "30s", "notes": "Rotation externe de hanche"},
                        {"name": "Face Pulls", "sets": "3", "reps": "15", "rest": "45s", "notes": "Rétracteurs d'omoplates"},
                        {"name": "Farmer's Walk", "sets": "3", "reps": "30m", "rest": "60s", "notes": "Posture droite, épaules basses"},
                    ],
                    "intensity": "RPE 5-6",
                    "duration": "35-40 min",
                },
                "wednesday": {
                    "name": "Repos / Yoga Restauratif",
                    "focus": "Étirements profonds et respiration",
                    "exercises": [
                        {"name": "Yoga restauratif ou Yin yoga", "sets": "-", "reps": "30-40 min", "rest": "-", "notes": "Postures tenues 2-5 min"},
                        {"name": "Respiration diaphragmatique", "sets": "-", "reps": "5 min", "rest": "-", "notes": "4s inspiration, 6s expiration"},
                    ],
                    "intensity": "RPE 2-3",
                    "duration": "35-45 min",
                },
                "thursday": {
                    "name": "Force Fonctionnelle",
                    "focus": "Mouvements composés légers avec focus technique",
                    "exercises": [
                        {"name": "Goblet Squat", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Profondeur, dos droit"},
                        {"name": "Push-ups (ou inclinés)", "sets": "3", "reps": "8-12", "rest": "60s", "notes": "Corps aligné comme une planche"},
                        {"name": "TRX Row (ou rowing haltère)", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Omoplates serrées"},
                        {"name": "Step-ups", "sets": "3", "reps": "8/jambe", "rest": "45s", "notes": "Hauteur progressive"},
                        {"name": "Planche abdominale", "sets": "3", "reps": "30-45s", "rest": "45s", "notes": "Gainage total"},
                    ],
                    "intensity": "RPE 6-7",
                    "duration": "40-45 min",
                },
                "friday": {
                    "name": "Mobilité & Étirements ciblés",
                    "focus": "Zones problématiques identifiées dans l'analyse",
                    "exercises": [
                        {"name": "Foam Rolling complet", "sets": "-", "reps": "15 min", "rest": "-", "notes": "Insister sur les zones tendues"},
                        {"name": "Étirements PNF", "sets": "2", "reps": "3 cycles/muscle", "rest": "-", "notes": "Contraction-relâchement-étirement"},
                        {"name": "World's Greatest Stretch", "sets": "3", "reps": "5/côté", "rest": "-", "notes": "Mobilité complète"},
                        {"name": "Dislocations d'épaule (bâton)", "sets": "3", "reps": "10", "rest": "30s", "notes": "Amplitude progressive"},
                    ],
                    "intensity": "RPE 3-4",
                    "duration": "30-35 min",
                },
                "saturday": {
                    "name": "Activité Récréative Douce",
                    "focus": "Mouvement plaisir",
                    "exercises": [
                        {"name": "Marche en nature ou natation", "sets": "-", "reps": "30-45 min", "rest": "-", "notes": "Plaisir et bien-être"},
                    ],
                    "intensity": "RPE 3-5",
                    "duration": "30-45 min",
                },
                "sunday": {
                    "name": "Repos Complet",
                    "focus": "Régénération",
                    "exercises": [
                        {"name": "Repos total", "sets": "-", "reps": "-", "rest": "-", "notes": "Sommeil, nutrition, hydratation"},
                    ],
                    "intensity": "RPE 1",
                    "duration": "0 min",
                },
            },
        }

    def _upper_lower_program(self, level, goal, sex, issues):
        return {
            "split_type": "Upper/Lower (4 jours)",
            "days": {
                "monday": {
                    "name": "Upper Body A — Force",
                    "focus": "Haut du corps — mouvements composés lourds",
                    "exercises": [
                        {"name": "Développé couché (barre)", "sets": "4", "reps": "5-7", "rest": "2-3 min", "notes": "Charge progressive"},
                        {"name": "Rowing barre (pronation)", "sets": "4", "reps": "6-8", "rest": "2 min", "notes": "Tirer vers le nombril"},
                        {"name": "Développé militaire (barre/haltères)", "sets": "3", "reps": "6-8", "rest": "2 min", "notes": "Strict, pas de triche"},
                        {"name": "Tractions (prise large)", "sets": "3", "reps": "6-10", "rest": "2 min", "notes": "Assistées si nécessaire"},
                        {"name": "Face pulls", "sets": "3", "reps": "15-20", "rest": "60s", "notes": "Santé des épaules"},
                        {"name": "Curl barre EZ", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Contrôle la descente"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "55-65 min",
                },
                "tuesday": {
                    "name": "Lower Body A — Force",
                    "focus": "Bas du corps — mouvements composés lourds",
                    "exercises": [
                        {"name": "Back Squat", "sets": "4", "reps": "5-7", "rest": "3 min", "notes": "Profondeur au parallèle"},
                        {"name": "Soulevé de terre roumain", "sets": "4", "reps": "6-8", "rest": "2-3 min", "notes": "Étirement des ischio-jambiers"},
                        {"name": "Presse à cuisses", "sets": "3", "reps": "8-10", "rest": "2 min", "notes": "Pieds haut pour fessiers"},
                        {"name": "Leg curl", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Contraction en haut"},
                        {"name": "Mollets debout", "sets": "4", "reps": "12-15", "rest": "60s", "notes": "Amplitude complète"},
                        {"name": "Ab wheel rollouts", "sets": "3", "reps": "8-12", "rest": "60s", "notes": "Gainage dynamique"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "55-65 min",
                },
                "wednesday": {
                    "name": "Récupération Active",
                    "focus": "Cardio léger + Mobilité",
                    "exercises": [
                        {"name": "Cardio basse intensité (LISS)", "sets": "-", "reps": "25-35 min", "rest": "-", "notes": "Marche rapide, vélo, elliptique"},
                        {"name": "Routine mobilité", "sets": "-", "reps": "15 min", "rest": "-", "notes": "Focus hanches et épaules"},
                        {"name": "Foam rolling", "sets": "-", "reps": "10 min", "rest": "-", "notes": "Auto-massage ciblé"},
                    ],
                    "intensity": "RPE 3-4",
                    "duration": "45-55 min",
                },
                "thursday": {
                    "name": "Upper Body B — Hypertrophie",
                    "focus": "Haut du corps — Volume et connexion",
                    "exercises": [
                        {"name": "Développé incliné haltères", "sets": "4", "reps": "8-12", "rest": "90s", "notes": "Étirement en bas"},
                        {"name": "Tirage vertical (prise serrée)", "sets": "4", "reps": "8-12", "rest": "90s", "notes": "Tirer vers la poitrine"},
                        {"name": "Élévations latérales", "sets": "4", "reps": "12-15", "rest": "60s", "notes": "Léger, technique parfaite"},
                        {"name": "Cable crossover", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contraction pectorale"},
                        {"name": "Curl haltères + Skull crushers", "sets": "3", "reps": "10-12 (superset)", "rest": "60s", "notes": "Supersets bras"},
                        {"name": "Shrugs haltères", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Monter + tenir 2s"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "55-65 min",
                },
                "friday": {
                    "name": "Lower Body B — Hypertrophie",
                    "focus": "Bas du corps — Volume et isolement",
                    "exercises": [
                        {"name": "Front Squat ou Goblet Squat", "sets": "4", "reps": "8-10", "rest": "2 min", "notes": "Dos droit, profondeur max"},
                        {"name": "Hip Thrusts", "sets": "4", "reps": "10-12", "rest": "90s", "notes": "Squeeze fessiers en haut"},
                        {"name": "Fentes bulgares", "sets": "3", "reps": "10-12/jambe", "rest": "60s", "notes": "Équilibre et amplitude"},
                        {"name": "Leg extensions", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contraction quadriceps"},
                        {"name": "Leg curl assis", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contrôle excentrique"},
                        {"name": "Mollets assis + Crunchs", "sets": "3", "reps": "15 + 15 (superset)", "rest": "60s", "notes": "Finisher"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "55-65 min",
                },
                "saturday": {
                    "name": "Cardio + Core (optionnel)",
                    "focus": "Conditionnement & abdominaux",
                    "exercises": [
                        {"name": "HIIT ou sport récréatif", "sets": "-", "reps": "20-30 min", "rest": "-", "notes": "Sprints, boxe, sport collectif"},
                        {"name": "Circuit abdos", "sets": "3 rounds", "reps": "10-15/exo", "rest": "30s", "notes": "Planche, leg raises, russian twists"},
                    ],
                    "intensity": "RPE 6-8",
                    "duration": "35-45 min",
                },
                "sunday": {
                    "name": "Repos Complet",
                    "focus": "Régénération totale",
                    "exercises": [
                        {"name": "Repos", "sets": "-", "reps": "-", "rest": "-", "notes": "Priorité sommeil, nutrition, bien-être"},
                    ],
                    "intensity": "RPE 1",
                    "duration": "0 min",
                },
            },
        }

    def _ppl_program(self, level, goal, sex, issues):
        return {
            "split_type": "Push/Pull/Legs (6 jours)",
            "days": {
                "monday": {
                    "name": "Push (Poussée)",
                    "focus": "Pectoraux, Épaules, Triceps",
                    "exercises": [
                        {"name": "Développé couché (barre)", "sets": "4", "reps": "6-8", "rest": "2-3 min", "notes": "Mouvement principal"},
                        {"name": "Développé incliné haltères", "sets": "3", "reps": "8-12", "rest": "90s", "notes": "Amplitude complète"},
                        {"name": "Développé militaire assis", "sets": "3", "reps": "8-10", "rest": "90s", "notes": "Strict"},
                        {"name": "Élévations latérales", "sets": "4", "reps": "12-15", "rest": "60s", "notes": "Léger, contrôlé"},
                        {"name": "Dips (pectoraux)", "sets": "3", "reps": "8-12", "rest": "90s", "notes": "Penché en avant"},
                        {"name": "Extension triceps poulie", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contraction complète"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "55-65 min",
                },
                "tuesday": {
                    "name": "Pull (Tirage)",
                    "focus": "Dos, Biceps, Arrière d'épaules",
                    "exercises": [
                        {"name": "Soulevé de terre", "sets": "4", "reps": "5-7", "rest": "3 min", "notes": "Mouvement principal"},
                        {"name": "Tractions (prise large)", "sets": "4", "reps": "6-10", "rest": "2 min", "notes": "Assistées si besoin"},
                        {"name": "Rowing haltère (1 bras)", "sets": "3", "reps": "8-10/bras", "rest": "60s", "notes": "Coude le long du corps"},
                        {"name": "Face pulls", "sets": "3", "reps": "15-20", "rest": "60s", "notes": "Rotation externe"},
                        {"name": "Curl barre EZ", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Strict"},
                        {"name": "Curl marteau", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Avant-bras et brachial"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "55-65 min",
                },
                "wednesday": {
                    "name": "Legs (Jambes)",
                    "focus": "Quadriceps, Ischio-jambiers, Fessiers, Mollets",
                    "exercises": [
                        {"name": "Back Squat", "sets": "4", "reps": "6-8", "rest": "3 min", "notes": "Mouvement principal"},
                        {"name": "Presse à cuisses", "sets": "3", "reps": "10-12", "rest": "2 min", "notes": "Pieds larges et hauts"},
                        {"name": "Soulevé de terre roumain", "sets": "3", "reps": "8-10", "rest": "2 min", "notes": "Étirement ischio"},
                        {"name": "Fentes marchées", "sets": "3", "reps": "10/jambe", "rest": "60s", "notes": "Grand pas"},
                        {"name": "Leg curl", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Contraction en haut"},
                        {"name": "Mollets debout", "sets": "4", "reps": "12-15", "rest": "60s", "notes": "Étirement + contraction"},
                    ],
                    "intensity": "RPE 8-9",
                    "duration": "60-70 min",
                },
                "thursday": {
                    "name": "Push (Hypertrophie)",
                    "focus": "Volume — Pectoraux, Épaules, Triceps",
                    "exercises": [
                        {"name": "Développé incliné barre", "sets": "4", "reps": "8-12", "rest": "90s", "notes": "Tempo 3-1-1"},
                        {"name": "Cable crossover", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Squeeze en bas"},
                        {"name": "Arnold press", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Rotation complète"},
                        {"name": "Élévations frontales", "sets": "3", "reps": "12-15", "rest": "45s", "notes": "Alterner bras"},
                        {"name": "Skull crushers", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "EZ bar"},
                        {"name": "Overhead triceps extension", "sets": "3", "reps": "12-15", "rest": "45s", "notes": "Câble ou haltère"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "50-60 min",
                },
                "friday": {
                    "name": "Pull (Hypertrophie)",
                    "focus": "Volume — Dos, Biceps",
                    "exercises": [
                        {"name": "Tirage vertical (prise neutre)", "sets": "4", "reps": "8-12", "rest": "90s", "notes": "Squeeze en bas"},
                        {"name": "Rowing câble (prise serrée)", "sets": "4", "reps": "10-12", "rest": "60s", "notes": "Tirer vers le nombril"},
                        {"name": "Pullover haltère", "sets": "3", "reps": "10-12", "rest": "60s", "notes": "Étirement dorsal"},
                        {"name": "Rear delt fly", "sets": "3", "reps": "15-20", "rest": "45s", "notes": "Léger, technique"},
                        {"name": "Curl concentration", "sets": "3", "reps": "10-12/bras", "rest": "45s", "notes": "Isolation pure"},
                        {"name": "Curl poulie basse", "sets": "3", "reps": "12-15", "rest": "45s", "notes": "Tension constante"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "50-60 min",
                },
                "saturday": {
                    "name": "Legs (Hypertrophie) + Core",
                    "focus": "Volume — Jambes + Abdominaux",
                    "exercises": [
                        {"name": "Front Squat", "sets": "4", "reps": "8-10", "rest": "2 min", "notes": "Dos droit"},
                        {"name": "Hip Thrusts", "sets": "4", "reps": "10-12", "rest": "90s", "notes": "Fessiers principaux"},
                        {"name": "Leg extensions", "sets": "3", "reps": "12-15", "rest": "60s", "notes": "Isolation quadriceps"},
                        {"name": "Fentes bulgares", "sets": "3", "reps": "10/jambe", "rest": "60s", "notes": "Profondeur"},
                        {"name": "Circuit abdos (planche, leg raises, russian twists)", "sets": "3 rounds", "reps": "12-15/exo", "rest": "30s", "notes": "Finisher core"},
                    ],
                    "intensity": "RPE 7-8",
                    "duration": "55-65 min",
                },
                "sunday": {
                    "name": "Repos Complet + Mobilité",
                    "focus": "Régénération totale",
                    "exercises": [
                        {"name": "Repos complet", "sets": "-", "reps": "-", "rest": "-", "notes": "Priorité sommeil et nutrition"},
                        {"name": "Mobilité légère (optionnel)", "sets": "-", "reps": "15 min", "rest": "-", "notes": "Yoga doux ou étirements"},
                    ],
                    "intensity": "RPE 1-2",
                    "duration": "0-15 min",
                },
            },
        }

    def _evaluation_program(self, level, goal, sex, issues):
        return {
            "split_type": "Évaluation & Récupération (1 semaine)",
            "days": {
                "monday": {
                    "name": "Tests de Force",
                    "focus": "Évaluer les progrès de force",
                    "exercises": [
                        {"name": "Test 5RM Squat", "sets": "Montée progressive", "reps": "5RM", "rest": "3-5 min", "notes": "Jusqu'au max technique"},
                        {"name": "Test 5RM Bench Press", "sets": "Montée progressive", "reps": "5RM", "rest": "3-5 min", "notes": "Avec pareur"},
                        {"name": "Test 5RM Deadlift", "sets": "Montée progressive", "reps": "5RM", "rest": "3-5 min", "notes": "Forme parfaite"},
                    ],
                    "intensity": "RPE 9-10",
                    "duration": "45-55 min",
                },
                "tuesday": {"name": "Repos & Mesures", "focus": "Prendre les mensurations, photos BodyVision AI", "exercises": [], "intensity": "RPE 1", "duration": "30 min"},
                "wednesday": {"name": "Cardio Test", "focus": "Test d'endurance", "exercises": [{"name": "Test 2km course ou 20 min vélo", "sets": "-", "reps": "Test", "rest": "-", "notes": "Mesurer temps/distance"}], "intensity": "RPE 8-9", "duration": "30 min"},
                "thursday": {"name": "Repos", "focus": "Récupération", "exercises": [], "intensity": "RPE 1", "duration": "0 min"},
                "friday": {"name": "Mobilité & Flexibilité Test", "focus": "Évaluer la mobilité", "exercises": [{"name": "Tests de mobilité (overhead squat, toe touch, etc.)", "sets": "-", "reps": "Test", "rest": "-", "notes": "Noter les progrès"}], "intensity": "RPE 3", "duration": "30 min"},
                "saturday": {"name": "Activité Libre", "focus": "Plaisir", "exercises": [], "intensity": "RPE 3-5", "duration": "30-45 min"},
                "sunday": {"name": "Planification", "focus": "Définir le prochain cycle", "exercises": [], "intensity": "RPE 1", "duration": "0 min"},
            },
        }

    def _get_progression_rules(self, level: str, goal: str) -> List[str]:
        rules = [
            "Double progression : augmenter les reps PUIS la charge",
            "Quand toutes les séries atteignent le haut de la fourchette de reps, augmenter la charge",
        ]
        if level == "beginner":
            rules.extend([
                "Progression linéaire : +2.5 kg (haut du corps) ou +5 kg (bas du corps) par semaine",
                "Si un exercice stagne 2 semaines → varier l'exercice ou le tempo",
            ])
        else:
            rules.extend([
                "Progression ondulante : alterner semaines de volume et d'intensité",
                "Utiliser le RPE pour autoréguler la charge quotidienne",
                "Techniques d'intensité (drop sets, rest-pause) en fin de mésocycle uniquement",
            ])
        return rules

    def _get_warmup_protocol(self, phase: Dict) -> Dict:
        return {
            "duration": "8-12 min",
            "steps": [
                "Cardio léger 3-5 min (rameur, vélo, corde à sauter)",
                "Foam rolling des muscles ciblés 2-3 min",
                "Mobilité dynamique articulaire 3-5 min",
                "2-3 séries d'échauffement progressives du premier exercice (50%, 70%, 85% de la charge de travail)",
            ],
        }

    def _get_cooldown_protocol(self) -> Dict:
        return {
            "duration": "8-10 min",
            "steps": [
                "Retour au calme : marche lente 2 min",
                "Étirements statiques des muscles travaillés (30s/muscle)",
                "Respiration diaphragmatique 2 min (4s inspire, 6s expire)",
                "Hydratation et nutrition post-entraînement",
            ],
        }

    def _get_adjustment_rules(self, goal: str) -> List[Dict[str, str]]:
        rules = [
            {
                "scenario": "Perte de poids stagne > 2 semaines",
                "action": "Réduire les calories de 100 kcal/jour OU ajouter 1 session cardio LISS",
            },
            {
                "scenario": "Perte de force en salle",
                "action": "Vérifier le sommeil et la nutrition. Si calories trop basses, augmenter de 100-200 kcal",
            },
            {
                "scenario": "Fatigue persistante (>1 semaine)",
                "action": "Réduire le volume de 30% pendant 1 semaine (mini deload)",
            },
            {
                "scenario": "Douleur articulaire persistante",
                "action": "Remplacer l'exercice problématique par une variante sans douleur. Consulter si > 2 semaines",
            },
            {
                "scenario": "Gain de poids trop rapide (>0.5 kg/semaine en prise de masse)",
                "action": "Réduire le surplus de 100-200 kcal pour limiter le gain de graisse",
            },
            {
                "scenario": "Progression excellente (tous les indicateurs positifs)",
                "action": "Maintenir le cap ! Augmenter l'intensité ou le volume de 5-10%",
            },
        ]
        return rules

    def _get_monthly_checkpoints(self, month: int, goal: str, profile: Dict) -> List[str]:
        base = [
            f"📸 Réaliser une nouvelle analyse BodyVision AI",
            f"📏 Prendre toutes les mensurations",
            f"💪 Tester les 5RM sur les mouvements clés",
        ]
        if month == 1:
            base.extend([
                "✅ Routine d'entraînement établie (3-4x/semaine)",
                "✅ Habitudes alimentaires de base en place",
                "✅ Technique maîtrisée sur les exercices fondamentaux",
            ])
        elif month == 2:
            base.extend([
                "📈 Progression mesurable sur les charges",
                "📉 Premiers changements visuels/composition corporelle",
                "🔄 Ajuster le plan si nécessaire (nutrition ou entraînement)",
            ])
        elif month == 3:
            base.extend([
                "🏆 Atteindre les objectifs intermédiaires de force",
                "📊 Comparaison avant/après significative",
                "🔄 Planifier le prochain mésocycle",
            ])
        else:
            base.extend([
                f"📊 Évaluation mois {month} — progrès continu",
                "🔄 Ajuster les phases restantes selon les résultats",
                "🎯 Réévaluer les objectifs si nécessaire",
            ])
        return base


# ══════════════════════════════════════════════════════════════
# INSTANCE GLOBALE
# ══════════════════════════════════════════════════════════════
fitness_plan_engine = FitnessPlanEngine()
