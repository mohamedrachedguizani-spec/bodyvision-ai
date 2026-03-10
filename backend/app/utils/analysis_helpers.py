"""
Fonctions utilitaires pour l'analyse corporelle.
"""
from typing import Dict


def create_merged_posture_analysis(
    front_analysis: Dict,
    posture_analyses: Dict,
    comprehensive_analysis: Dict,
) -> Dict:
    """
    Crée une analyse posturale fusionnée à partir de toutes les vues.
    """
    merged = front_analysis.copy() if front_analysis else {}

    if not comprehensive_analysis:
        return merged

    # Mettre à jour le score et le grade avec la fusion
    merged["posture_score"] = comprehensive_analysis.get(
        "comprehensive_posture_score", merged.get("posture_score", 0)
    )
    merged["posture_grade"] = comprehensive_analysis.get(
        "comprehensive_grade", merged.get("posture_grade", "À évaluer")
    )

    # Ajouter les données de fusion
    merged["comprehensive_analysis"] = comprehensive_analysis

    # Fusionner les problèmes détectés
    all_issues = []
    for view_type, analysis in posture_analyses.items():
        if analysis and isinstance(analysis, dict):
            issues = analysis.get("detected_issues", [])
            for issue in issues:
                if isinstance(issue, dict):
                    issue_with_context = issue.copy()
                    issue_with_context["detected_in_view"] = view_type
                    issue_with_context["view_type"] = view_type
                    all_issues.append(issue_with_context)

    # Ajouter les problèmes prioritaires de l'analyse complète
    primary_problems = comprehensive_analysis.get("primary_postural_problems", [])
    for problem in primary_problems:
        all_issues.append(
            {
                "issue": problem.get("description", ""),
                "severity": problem.get("severity", "Moyenne"),
                "impact": problem.get("impact", ""),
                "priority": "Haute",
                "detected_in_view": "multi-view",
                "view_type": "comprehensive",
            }
        )

    merged["detected_issues"] = all_issues
    merged["primary_postural_problems"] = primary_problems

    # Ajouter les recommandations prioritaires sans dupliquer les catégories
    priority_recommendations = comprehensive_analysis.get("recommendations_priority", [])
    if priority_recommendations:
        existing = merged.get("improvement_recommendations", [])
        existing_categories = {
            r.get("category", "") for r in existing if isinstance(r, dict)
        }
        new_recs = [
            r for r in priority_recommendations
            if isinstance(r, dict) and r.get("category", "") not in existing_categories
        ]
        merged["improvement_recommendations"] = new_recs + existing

    # Métadonnées de fusion
    merged["analysis_method"] = (
        f"Fusion multi-vues intelligente ({len(posture_analyses)} vues)"
    )
    merged["confidence"] = comprehensive_analysis.get("analysis_confidence", "Moyenne")
    merged["views_analyzed"] = list(posture_analyses.keys())
    merged["view_contributions"] = comprehensive_analysis.get("view_contributions", {})

    return merged
