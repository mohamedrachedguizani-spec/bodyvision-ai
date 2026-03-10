"""
Génération de recommandations ciblées.

Ce module transforme les résultats d'analyse posturale et de composition
corporelle en recommandations actionnables (exercices, fréquence, durée).
"""

from typing import Dict, Any, List

from app.analysis.constants import PROBLEM_PROTOCOLS


class RecommendationEngine:
    """Génère des recommandations personnalisées."""

    # ══════════════════════════════════════════════════════════
    # RECOMMANDATIONS POSTURALES
    # ══════════════════════════════════════════════════════════

    def from_posture_issues(self, issues: List[Dict]) -> List[Dict[str, Any]]:
        """
        Transforme une liste de problèmes posturaux détectés en
        recommandations d'exercices classées par priorité.
        Déduplique les catégories pour éviter les répétitions.
        """
        recs: List[Dict[str, Any]] = []
        seen_categories: set = set()

        for issue in issues:
            text = issue.get("issue", "").lower() if isinstance(issue, dict) else str(issue).lower()
            matched = self._match_issue(text)
            if matched:
                cat = matched.get("category", "")
                if cat in seen_categories:
                    continue
                seen_categories.add(cat)
                rec = matched.copy()
                rec["target_problem"] = issue.get("issue", "") if isinstance(issue, dict) else str(issue)
                rec["severity"] = issue.get("severity", "Moyenne") if isinstance(issue, dict) else "Moyenne"
                recs.append(rec)

        # Ajouter la recommandation générale uniquement si aucun problème spécifique n'a été trouvé
        if not recs:
            recs.append({
                "category": "Posture générale",
                "exercises": [
                    "Posture du mur 5 min/jour : dos contre mur, talons à 10 cm",
                    "Respiration diaphragmatique 10× matin et soir",
                    "Étirements cervicaux toutes les 2 heures",
                ],
                "frequency": "Quotidien",
                "duration": "10-15 minutes",
                "priority": "Moyenne",
            })

        return recs

    def priority_from_problems(self, primary_problems: List[Dict]) -> List[Dict[str, Any]]:
        """
        Génère des recommandations prioritaires à partir de problèmes
        identifiés par la fusion multi-vues.
        Déduplique par catégorie.
        """
        recs: List[Dict[str, Any]] = []
        seen_categories: set = set()

        for problem in primary_problems:
            ptype = problem.get("type", "")
            if ptype in PROBLEM_PROTOCOLS:
                rec = PROBLEM_PROTOCOLS[ptype].copy()
                cat = rec.get("category", "")
                if cat in seen_categories:
                    continue
                seen_categories.add(cat)
                rec["target_problem"] = problem.get("description", "")
                rec["severity"] = problem.get("severity", "Moyenne")
                rec["priority"] = "Haute"
                recs.append(rec)

        if not recs:
            recs.append({
                "category": "Posture générale",
                "exercises": [
                    "Posture du mur 5 min/jour",
                    "Respiration diaphragmatique 10× matin et soir",
                    "Étirements cervicaux toutes les 2 heures",
                ],
                "frequency": "Quotidien",
                "priority": "Moyenne",
                "target_problem": "Amélioration posturale générale",
            })

        return recs

    # ══════════════════════════════════════════════════════════
    # RECOMMANDATIONS COMPOSITION CORPORELLE
    # ══════════════════════════════════════════════════════════

    def from_body_composition(
        self,
        posture_analysis: Dict[str, Any],
        body_comp: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Génère un ensemble complet de recommandations (force, flexibilité,
        nutrition, cardio, style de vie) basé sur la composition corporelle.
        """
        recs: Dict[str, Any] = {
            "strength_training": [],
            "flexibility_work": [],
            "nutrition_advice": [],
            "cardio_recommendations": [],
            "lifestyle_changes": _lifestyle_defaults(),
            "weekly_schedule": {},
            "progress_tracking": _progress_tracking(),
        }

        score = posture_analysis.get("posture_score", 0)
        if score < 70:
            recs["flexibility_work"] = [
                "Étirements des pectoraux et fléchisseurs de hanche 2× par jour",
                "Mobilité articulaire (épaules, thoracique) 10 min/jour",
                "Yoga correctif ou Pilates 2×/semaine",
            ]

        body_type = body_comp.get("body_composition_class", "").lower()
        weight = body_comp.get("weight") or 70
        bf = body_comp.get("body_fat_percentage")
        smm = body_comp.get("skeletal_muscle_mass_kg")

        # BMR / nutrition
        from app.analysis.body_composition import BodyCompositionAnalyzer as BCA
        bmr = BCA.calculate_bmr(
            weight,
            body_comp.get("height"),
            body_comp.get("age"),
            body_comp.get("sex"),
        )
        if bmr:
            recs["nutrition_advice"].extend(
                self._nutrition_for_goal(bf, smm, weight, bmr, body_type)
            )

        # Type corporel → programme
        self._apply_body_type_recs(recs, body_type, weight)
        recs["weekly_schedule"] = _weekly_schedule(body_type)

        return recs

    # ─── Helpers internes ─────────────────────────────────────

    @staticmethod
    def _match_issue(text: str) -> Dict[str, Any] | None:
        keywords_map = {
            "épaules arrondies": "asymétrie_épaules",
            "bascule du bassin": "bascule_bassin",
            "pelvic tilt": "bascule_bassin",
            "tête penchée en avant": "tête_avant",
            "forward head": "tête_avant",
            "cyphose": "cyphose",
            "dos rond": "cyphose",
            "lordose": "lordose",
            "cambrure": "lordose",
            "scoliose": "scoliose_indicateur",
            "inclinaison": "inclinaison_tête",
        }
        for keyword, proto_key in keywords_map.items():
            if keyword in text and proto_key in PROBLEM_PROTOCOLS:
                return PROBLEM_PROTOCOLS[proto_key].copy()
        return None

    @staticmethod
    def _nutrition_for_goal(bf, smm, weight, bmr, body_type) -> List[str]:
        advice: List[str] = []
        if bf and bf > 25:
            cal = round(bmr * 1.2 - 500)
            advice.append(f"Cible calorique : {cal} kcal/jour (déficit 500 kcal)")
        elif smm and weight:
            pct = (smm / weight) * 100
            if pct < 40:
                cal = round(bmr * 1.4 + 300)
                advice.append(f"Cible calorique : {cal} kcal/jour (surplus 300 kcal)")
            else:
                cal = round(bmr * 1.3)
                advice.append(f"Cible calorique : {cal} kcal/jour (maintien)")
        return advice

    @staticmethod
    def _apply_body_type_recs(recs: Dict, body_type: str, weight: float):
        if "musculaire" in body_type:
            recs["strength_training"] = [
                "Entraînement en force 4×/semaine (push/pull/legs/upper)",
                "Exercices composés charges lourdes (3-5 reps)",
                "Travail de définition (8-12 reps)",
            ]
            recs["nutrition_advice"].extend([
                f"Protéines : {round(weight * 2.2, 1)} g/jour",
                "Glucides complexes autour des entraînements",
            ])
            recs["cardio_recommendations"] = [
                "Cardio léger 2×/semaine (30 min marche rapide)",
                "HIIT 1×/semaine",
            ]
        elif "obèse" in body_type or "surpoids" in body_type:
            recs["strength_training"] = [
                "Full body 3×/semaine pour préserver la masse musculaire",
                "Exercices poids du corps ou charges légères",
                "Focus technique et amplitude de mouvement",
            ]
            recs["cardio_recommendations"] = [
                "Cardio modéré 4-5×/semaine (30-45 min)",
                "Marche rapide, vélo stationnaire ou natation",
            ]
            recs["nutrition_advice"].extend([
                f"Protéines : {round(weight * 1.8, 1)} g/jour",
                "Réduction des glucides simples",
                "Augmenter les fibres (légumes, fruits entiers)",
            ])
        elif "maigre" in body_type:
            recs["strength_training"] = [
                "Entraînement en force 3-4×/semaine volume modéré",
                "Focus exercices de base (squat, développé, soulevé)",
                "Repos 2-3 min entre séries",
            ]
            recs["nutrition_advice"].extend([
                "Surplus calorique 300-500 kcal/jour",
                f"Protéines : {round(weight * 2.0, 1)} g/jour",
                "Collations riches en calories entre repas",
            ])
            recs["cardio_recommendations"] = [
                "Cardio minimal 1-2×/semaine (20 min max)",
            ]
        else:
            recs["strength_training"] = [
                "Entraînement équilibré 3-4×/semaine",
                "Combinaison force (4-6 reps) et hypertrophie (8-12 reps)",
            ]
            recs["nutrition_advice"].extend([
                f"Protéines : {round(weight * 1.6, 1)} g/jour",
            ])
            recs["cardio_recommendations"] = [
                "Cardio 2-3×/semaine (20-30 min)",
            ]


# ══════════════════════════════════════════════════════════════
# TABLES DE DONNÉES STATIQUES
# ══════════════════════════════════════════════════════════════


def _lifestyle_defaults() -> List[str]:
    return [
        "Dormir 7-9 heures par nuit",
        "S'hydrater 2-3 L/jour (plus si entraînement intensif)",
        "Gérer le stress : méditation, respiration ou marche",
        "Consulter un professionnel de santé avant changement majeur",
    ]


def _progress_tracking() -> Dict[str, Any]:
    return {
        "weekly_measurements": ["Poids", "Tour de taille", "Force exercices clés"],
        "monthly_photos": "Photos sous mêmes conditions",
        "key_metrics": ["% masse grasse", "Masse musculaire", "Performances"],
    }


def _weekly_schedule(body_type: str) -> Dict[str, str]:
    if "musculaire" in body_type:
        return {
            "lundi": "Poussée (pectoraux, épaules, triceps) + Cardio léger",
            "mardi": "Tirage (dos, biceps) + Étirements",
            "mercredi": "Jambes complètes + Abdominaux",
            "jeudi": "Repos actif (marche, étirements)",
            "vendredi": "Upper body (force) + HIIT",
            "samedi": "Lower body (hypertrophie)",
            "dimanche": "Repos complet",
        }
    if "obèse" in body_type or "surpoids" in body_type:
        return {
            "lundi": "Full body léger + Cardio 30 min",
            "mardi": "Marche rapide 45 min + Étirements",
            "mercredi": "Full body + Cardio 30 min",
            "jeudi": "Repos actif (yoga doux)",
            "vendredi": "Full body + HIIT 20 min",
            "samedi": "Cardio 45 min (natation/vélo)",
            "dimanche": "Repos complet",
        }
    if "maigre" in body_type:
        return {
            "lundi": "Full body (force)",
            "mardi": "Repos + Collations riches",
            "mercredi": "Full body (volume)",
            "jeudi": "Repos actif léger",
            "vendredi": "Full body (hypertrophie)",
            "samedi": "Cardio très léger 20 min",
            "dimanche": "Repos complet",
        }
    return {
        "lundi": "Upper body + Cardio 20 min",
        "mardi": "Lower body + Étirements",
        "mercredi": "Cardio 30 min + Yoga",
        "jeudi": "Full body (force)",
        "vendredi": "Repos actif",
        "samedi": "Sport loisir (tennis, randonnée)",
        "dimanche": "Repos complet",
    }
