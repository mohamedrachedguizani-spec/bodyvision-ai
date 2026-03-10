"""
Routes pour la génération de plans fitness intelligents multi-phases.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
import json

from app.database import get_db
from app.dependencies import get_current_user_from_header
from app.models import User
from app.ai_services import generate_fitness_plan

router = APIRouter(tags=["Fitness"])


@router.post("/generate-intelligent-fitness-plan")
async def generate_intelligent_fitness_plan(
    analysis_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """Génère un plan fitness intelligent, multi-phases et personnalisé."""
    try:
        print(f"🎯 Generating intelligent multi-phase fitness plan for user: {current_user.id}")

        analysis_id = analysis_data.get("analysis_id")
        if not analysis_id:
            raise HTTPException(status_code=400, detail="Analysis ID is required")

        # Vérifier que l'analyse appartient à l'utilisateur
        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, analysis_data FROM analyses WHERE id = %s AND user_id = %s",
            (analysis_id, current_user.id),
        )
        analysis = cursor.fetchone()

        if not analysis:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Construire les données utilisateur enrichies
        user_data = {
            "weight": current_user.weight,
            "height": current_user.height,
            "age": current_user.age,
            "sex": current_user.sex,
            # Priorité: requête → profil utilisateur → défaut
            "activity_level": analysis_data.get("activity_level")
                              or current_user.activity_level
                              or "moderate",
        }

        # Fusionner les données d'analyse de la DB si nécessaire
        stored_analysis = analysis.get("analysis_data")
        if stored_analysis:
            if isinstance(stored_analysis, str):
                try:
                    stored_analysis = json.loads(stored_analysis)
                except json.JSONDecodeError:
                    stored_analysis = {}
            # Utiliser les données stockées comme base, enrichies par les données envoyées
            for key in ("body_composition_complete", "posture_analysis", "muscle_analysis",
                        "health_assessment", "yolo_detection"):
                if key not in analysis_data and key in stored_analysis:
                    analysis_data[key] = stored_analysis[key]

        result = await generate_fitness_plan(analysis_data, user_data)

        # Sauvegarder le plan
        if result and result.get("fitness_plan"):
            plan_json = json.dumps(result["fitness_plan"], ensure_ascii=False)

            cursor.execute(
                "SELECT id FROM fitness_plans WHERE analysis_id = %s", (analysis_id,)
            )
            existing_plan = cursor.fetchone()

            if existing_plan:
                cursor.execute(
                    """
                    UPDATE fitness_plans
                    SET plan_data = %s, created_at = CURRENT_TIMESTAMP, plan_type = 'intelligent_v3'
                    WHERE analysis_id = %s
                    """,
                    (plan_json, analysis_id),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO fitness_plans (analysis_id, plan_data, plan_type)
                    VALUES (%s, %s, 'intelligent_v3')
                    """,
                    (analysis_id, plan_json),
                )

            db.commit()
            print(f"✅ Intelligent v3 fitness plan saved for analysis {analysis_id}")

        cursor.close()
        db.close()

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in generate-intelligent-fitness-plan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
