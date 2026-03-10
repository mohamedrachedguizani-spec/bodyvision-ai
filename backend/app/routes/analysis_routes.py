"""
Routes d'analyse corporelle : analyse multi-vues, historique, détails, suppression.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from typing import Optional
import os
import json
import uuid
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user_from_header
from app.models import User
from app.ai_services import analyze_body_image
from app.body_analysis_engine import body_analysis_engine
from app.utils.analysis_helpers import create_merged_posture_analysis

router = APIRouter(tags=["Analysis"])


@router.post("/analyze-body-comprehensive-enhanced")
async def analyze_body_comprehensive_enhanced(
    front_file: UploadFile = File(...),
    back_file: Optional[UploadFile] = File(None),
    side_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user_from_header),
    activity_level: Optional[str] = Body("moderate"),
):
    """Analyse corporelle complète améliorée avec fusion intelligente multi-vues."""
    try:
        print("📥 Starting enhanced comprehensive analysis with multi-view fusion")

        # Sauvegarder les images
        image_paths = {}
        image_filenames = {}

        for file_type, file in [("front", front_file), ("back", back_file), ("side", side_file)]:
            if file:
                if not file.content_type.startswith("image/"):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Le fichier {file_type} doit être une image",
                    )

                file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
                unique_filename = f"{current_user.id}_{file_type}_{uuid.uuid4()}.{file_extension}"
                file_location = f"uploads/{unique_filename}"

                with open(file_location, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)

                image_paths[file_type] = file_location
                image_filenames[file_type] = unique_filename
                print(f"✅ {file_type} image saved: {file_location}")

        # Préparer les données utilisateur
        user_data = {
            "weight": current_user.weight,
            "height": current_user.height,
            "age": current_user.age,
            "sex": current_user.sex,
            "activity_level": activity_level,
        }

        main_image_path = image_paths.get("front")
        if not main_image_path:
            raise HTTPException(status_code=400, detail="Photo frontale requise")

        # ANALYSE MULTI-VUES
        print("🔄 Starting comprehensive multi-view analysis…")

        # 1. Analyse frontale complète
        print("🔍 Processing front view…")
        front_analysis = await analyze_body_image(main_image_path, current_user.id, user_data)

        # 2. Analyses posturales par vue
        posture_analyses = {"front": front_analysis.get("posture_analysis", {})}

        for view_type in ["back", "side"]:
            if view_type in image_paths:
                print(f"🔍 Processing {view_type} view…")
                try:
                    posture_analysis = body_analysis_engine.analyze_posture_with_mediapipe(
                        image_paths[view_type], view_type
                    )
                    posture_analyses[view_type] = posture_analysis
                    print(f"✅ {view_type} score: {posture_analysis.get('posture_score', 0)}")
                except Exception as e:
                    print(f"⚠️ {view_type} analysis failed: {e}")
                    posture_analyses[view_type] = {
                        "posture_score": 0,
                        "posture_grade": "Non analysé",
                        "detected_issues": [],
                        "view_type": view_type,
                        "error": str(e),
                    }

        # 3. Fusion intelligente
        print("🔄 Performing intelligent multi-view fusion…")
        comprehensive_analysis = body_analysis_engine.calculate_comprehensive_posture_score(posture_analyses)

        merged_posture = create_merged_posture_analysis(
            front_analysis.get("posture_analysis", {}),
            posture_analyses,
            comprehensive_analysis,
        )
        front_analysis["posture_analysis"] = merged_posture

        # 4. Métadonnées multi-vues
        front_analysis["multi_view_analysis"] = {
            "available_views": list(image_paths.keys()),
            "posture_scores": {
                k: v.get("posture_score", 0)
                for k, v in posture_analyses.items()
                if isinstance(v, dict)
            },
            "comprehensive_analysis": comprehensive_analysis,
            "analysis_confidence": (
                comprehensive_analysis.get("analysis_confidence", "Moyenne")
                if comprehensive_analysis
                else "Moyenne"
            ),
            "views_analyzed_count": len(image_paths),
            "fusion_method": "Intelligent weighted fusion",
            "timestamp": datetime.now().isoformat(),
        }

        analysis_result = front_analysis

        # Sauvegarder en base
        db = get_db()
        if db:
            cursor = db.cursor()
            analysis_json = json.dumps(analysis_result, ensure_ascii=False)
            cursor.execute(
                """
                INSERT INTO analyses (user_id, image_path, analysis_data, multi_view_images)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    current_user.id,
                    image_filenames.get("front"),
                    analysis_json,
                    json.dumps(image_filenames),
                ),
            )
            db.commit()
            analysis_id = cursor.lastrowid
            cursor.close()
            db.close()

            return {
                "analysis_id": analysis_id,
                "analysis": analysis_result,
                "image_urls": {k: f"/uploads/{v}" for k, v in image_filenames.items()},
                "message": f"Multi-view analysis completed ({len(image_paths)} views)",
                "analysis_confidence": (
                    comprehensive_analysis.get("analysis_confidence", "Moyenne")
                    if comprehensive_analysis
                    else "Moyenne"
                ),
                "comprehensive_score": (
                    comprehensive_analysis.get("comprehensive_posture_score", 0)
                    if comprehensive_analysis
                    else 0
                ),
            }
        else:
            raise HTTPException(status_code=500, detail="Database connection failed")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in enhanced comprehensive analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


# ──────────────────────────────────────────────────────────────
# Statistiques agrégées
# ──────────────────────────────────────────────────────────────

@router.get("/user-stats")
async def get_user_stats(current_user: User = Depends(get_current_user_from_header)):
    """
    Retourne les statistiques agrégées de l'utilisateur calculées côté base de données.
    Beaucoup plus efficace que de charger toutes les analyses et calculer côté frontend.
    """
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor(dictionary=True)
    try:
        user_id = current_user.id

        # ── Compteurs globaux ────────────────────────────────────
        cursor.execute(
            """
            SELECT
                COUNT(a.id)                                          AS total_analyses,
                SUM(
                    CASE WHEN JSON_EXTRACT(a.analysis_data,
                        '$.body_composition_complete.basic_metrics.bmi') IS NOT NULL
                    THEN 1 ELSE 0 END
                )                                                    AS enhanced_analyses,
                MAX(a.created_at)                                    AS last_analysis_date,
                MAX(CAST(JSON_EXTRACT(a.analysis_data,
                    '$.posture_analysis.posture_score')
                    AS DECIMAL(10,2)))                               AS best_posture_score
            FROM analyses a
            WHERE a.user_id = %s
            """,
            (user_id,),
        )
        counts = cursor.fetchone()

        # ── Métriques de la dernière analyse ─────────────────────
        cursor.execute(
            """
            SELECT
                CAST(JSON_EXTRACT(a.analysis_data,
                    '$.body_composition_complete.basic_metrics.bmi')
                    AS DECIMAL(10,2))                                AS last_bmi,
                CAST(JSON_EXTRACT(a.analysis_data,
                    '$.body_composition_complete.fat_analysis.body_fat_percentage')
                    AS DECIMAL(10,2))                                AS last_body_fat,
                CAST(JSON_EXTRACT(a.analysis_data,
                    '$.body_composition_complete.muscle_analysis.muscle_percentage')
                    AS DECIMAL(10,2))                                AS last_muscle,
                CAST(JSON_EXTRACT(a.analysis_data,
                    '$.posture_analysis.posture_score')
                    AS DECIMAL(10,2))                                AS last_posture_score
            FROM analyses a
            WHERE a.user_id = %s
            ORDER BY a.created_at DESC
            LIMIT 1
            """,
            (user_id,),
        )
        last_row = cursor.fetchone() or {}

        # ── Plans fitness ────────────────────────────────────────
        cursor.execute(
            """
            SELECT COUNT(*) AS fitness_plans
            FROM fitness_plans fp
            INNER JOIN analyses a ON fp.analysis_id = a.id
            WHERE a.user_id = %s
            """,
            (user_id,),
        )
        plan_row = cursor.fetchone()

        # ── Évolution posture (5 derniers scores) ────────────────
        cursor.execute(
            """
            SELECT
                a.id,
                a.created_at,
                CAST(JSON_EXTRACT(a.analysis_data, '$.posture_analysis.posture_score')
                    AS DECIMAL(10,2)) AS posture_score,
                CAST(JSON_EXTRACT(a.analysis_data,
                    '$.body_composition_complete.basic_metrics.bmi')
                    AS DECIMAL(10,2)) AS bmi
            FROM analyses a
            WHERE a.user_id = %s
              AND JSON_EXTRACT(a.analysis_data, '$.posture_analysis.posture_score') IS NOT NULL
            ORDER BY a.created_at DESC
            LIMIT 5
            """,
            (user_id,),
        )
        recent_rows = cursor.fetchall()

        cursor.close()
        db.close()

        # ── Formatage de la réponse ──────────────────────────────
        def safe_round(val, digits=1):
            try:
                return round(float(val), digits) if val is not None else None
            except (TypeError, ValueError):
                return None

        total       = int(counts["total_analyses"] or 0)
        enhanced    = int(counts["enhanced_analyses"] or 0)
        fitness_cnt = int(plan_row["fitness_plans"] or 0)
        enhanced_pct = round((enhanced / total * 100)) if total else 0
        fitness_pct  = round((fitness_cnt / total * 100)) if total else 0

        trend = [
            {
                "analysis_id": r["id"],
                "date": r["created_at"].isoformat() if r["created_at"] else None,
                "posture_score": safe_round(r["posture_score"]),
                "bmi": safe_round(r["bmi"]),
            }
            for r in reversed(recent_rows)   # ordre chronologique
        ]

        return {
            # Compteurs
            "total_analyses":     total,
            "enhanced_analyses":  enhanced,
            "fitness_plans":      fitness_cnt,
            # Pourcentages
            "enhanced_pct":       enhanced_pct,
            "fitness_pct":        fitness_pct,
            # Métriques dernière analyse
            "last_bmi":           safe_round(last_row.get("last_bmi")),
            "last_body_fat":      safe_round(last_row.get("last_body_fat")),
            "last_muscle":        safe_round(last_row.get("last_muscle")),
            "last_posture_score": safe_round(last_row.get("last_posture_score")),
            "best_posture_score": safe_round(counts["best_posture_score"]),
            # Meta
            "last_analysis_date": (
                counts["last_analysis_date"].isoformat()
                if counts["last_analysis_date"] else None
            ),
            "trend": trend,
        }

    except Exception as e:
        cursor.close()
        db.close()
        print(f"❌ Error in get_user_stats: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur statistiques: {str(e)}")


# ──────────────────────────────────────────────────────────────
# Historique & détails
# ──────────────────────────────────────────────────────────────

@router.get("/user-analyses")
async def get_user_analyses(current_user: User = Depends(get_current_user_from_header)):
    """Récupère toutes les analyses de l'utilisateur avec les plans fitness."""
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor(dictionary=True)

    try:
        # Vérifier si la colonne plan_type existe
        cursor.execute(
            """
            SELECT COUNT(*) as column_exists
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'fitness_plans'
              AND COLUMN_NAME = 'plan_type'
            """
        )
        column_exists = cursor.fetchone()["column_exists"] > 0

        if column_exists:
            query = """
                SELECT a.*, fp.plan_data as fitness_plan_data, fp.plan_type
                FROM analyses a
                LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
                WHERE a.user_id = %s
                ORDER BY a.created_at DESC
            """
        else:
            query = """
                SELECT a.*, fp.plan_data as fitness_plan_data
                FROM analyses a
                LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
                WHERE a.user_id = %s
                ORDER BY a.created_at DESC
            """

        cursor.execute(query, (current_user.id,))
        analyses = cursor.fetchall()

    except Exception as e:
        print(f"❌ Error executing query: {e}")
        cursor.execute(
            """
            SELECT a.*, fp.plan_data as fitness_plan_data
            FROM analyses a
            LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
            WHERE a.user_id = %s
            ORDER BY a.created_at DESC
            """,
            (current_user.id,),
        )
        analyses = cursor.fetchall()

    cursor.close()
    db.close()

    formatted_analyses = []
    for analysis in analyses:
        try:
            analysis_data = (
                json.loads(analysis["analysis_data"])
                if isinstance(analysis["analysis_data"], str)
                else analysis["analysis_data"]
            )

            fitness_plan = None
            if analysis.get("fitness_plan_data"):
                try:
                    fitness_plan = (
                        json.loads(analysis["fitness_plan_data"])
                        if isinstance(analysis["fitness_plan_data"], str)
                        else analysis["fitness_plan_data"]
                    )
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"❌ Error parsing fitness plan for analysis {analysis['id']}: {e}")

            plan_type = analysis.get("plan_type", "basic")
            if plan_type == "basic" and fitness_plan:
                try:
                    plan_json = (
                        json.loads(fitness_plan)
                        if isinstance(fitness_plan, str)
                        else fitness_plan
                    )
                    if "phase_1_microcycle_4_semaines" in plan_json or "personal_profile_summary" in plan_json:
                        plan_type = "intelligent"
                except Exception:
                    pass

            multi_view_images = {}
            if analysis.get("multi_view_images"):
                try:
                    if isinstance(analysis["multi_view_images"], str):
                        multi_view_images = json.loads(analysis["multi_view_images"])
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"❌ Error parsing multi_view_images: {e}")

            formatted_analyses.append(
                {
                    "id": analysis["id"],
                    "user_id": analysis["user_id"],
                    "image_path": analysis.get("image_path"),
                    "analysis_data": analysis_data,
                    "created_at": (
                        analysis["created_at"].isoformat() if analysis["created_at"] else None
                    ),
                    "fitness_plan": fitness_plan,
                    "has_fitness_plan": fitness_plan is not None,
                    "plan_type": plan_type,
                    "multi_view_images": multi_view_images,
                }
            )
        except (json.JSONDecodeError, KeyError) as e:
            print(f"❌ Error parsing analysis {analysis.get('id')}: {e}")
            formatted_analyses.append(
                {
                    "id": analysis["id"],
                    "user_id": analysis["user_id"],
                    "image_path": analysis.get("image_path", ""),
                    "analysis_data": {
                        "error": "Données d'analyse corrompues",
                        "posture_analysis": {"posture_score": 0},
                        "body_composition_complete": {},
                        "muscle_analysis": {},
                        "fitness_recommendations": {},
                        "health_assessment": {},
                    },
                    "created_at": (
                        analysis["created_at"].isoformat() if analysis["created_at"] else None
                    ),
                    "fitness_plan": None,
                    "has_fitness_plan": False,
                    "plan_type": "basic",
                    "multi_view_images": {},
                }
            )

    print(f"✅ Retrieved {len(formatted_analyses)} analyses for user {current_user.id}")
    return formatted_analyses


@router.get("/analysis/{analysis_id}")
async def get_analysis_details(
    analysis_id: int,
    current_user: User = Depends(get_current_user_from_header),
):
    """Récupère les détails complets d'une analyse."""
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT a.*, fp.plan_data as fitness_plan_data, fp.plan_type
        FROM analyses a
        LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
        WHERE a.id = %s AND a.user_id = %s
        """,
        (analysis_id, current_user.id),
    )
    analysis = cursor.fetchone()
    cursor.close()
    db.close()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    try:
        analysis_data = (
            json.loads(analysis["analysis_data"])
            if isinstance(analysis["analysis_data"], str)
            else analysis["analysis_data"]
        )

        fitness_plan = None
        if analysis.get("fitness_plan_data"):
            try:
                fitness_plan = (
                    json.loads(analysis["fitness_plan_data"])
                    if isinstance(analysis["fitness_plan_data"], str)
                    else analysis["fitness_plan_data"]
                )
            except (json.JSONDecodeError, TypeError) as e:
                print(f"❌ Error parsing fitness plan: {e}")

        multi_view_images = {}
        if analysis.get("multi_view_images"):
            try:
                if isinstance(analysis["multi_view_images"], str):
                    multi_view_images = json.loads(analysis["multi_view_images"])
                    for view_type, filename in multi_view_images.items():
                        if filename and not filename.startswith("http"):
                            multi_view_images[view_type] = f"/uploads/{filename}"
            except (json.JSONDecodeError, TypeError) as e:
                print(f"❌ Error parsing multi_view_images: {e}")

        image_path = analysis.get("image_path")
        if image_path and not image_path.startswith("http"):
            image_path = f"/uploads/{image_path}"

        return {
            "id": analysis["id"],
            "user_id": analysis["user_id"],
            "image_path": image_path,
            "analysis_data": analysis_data,
            "created_at": (
                analysis["created_at"].isoformat() if analysis["created_at"] else None
            ),
            "fitness_plan": fitness_plan,
            "has_fitness_plan": fitness_plan is not None,
            "plan_type": analysis.get("plan_type", "basic"),
            "multi_view_images": multi_view_images,
        }

    except (json.JSONDecodeError, KeyError) as e:
        print(f"❌ Error parsing analysis details: {e}")
        raise HTTPException(status_code=500, detail="Error parsing analysis data")


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user_from_header),
):
    """Supprime une analyse et ses fichiers associés."""
    try:
        print(f"🗑️ Deleting analysis {analysis_id} for user {current_user.id}")

        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, image_path, multi_view_images FROM analyses WHERE id = %s AND user_id = %s",
            (analysis_id, current_user.id),
        )
        analysis = cursor.fetchone()

        if not analysis:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Supprimer les fichiers d'images
        try:
            if analysis.get("image_path"):
                path = analysis["image_path"]
                if isinstance(path, str) and not path.startswith("http"):
                    file_location = f"uploads/{path}"
                    if os.path.exists(file_location):
                        os.remove(file_location)

            if analysis.get("multi_view_images"):
                try:
                    mvi = (
                        json.loads(analysis["multi_view_images"])
                        if isinstance(analysis["multi_view_images"], str)
                        else analysis["multi_view_images"]
                    )
                    for _vt, filename in mvi.items():
                        if filename and isinstance(filename, str) and not filename.startswith("http"):
                            loc = f"uploads/{filename}"
                            if os.path.exists(loc):
                                os.remove(loc)
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass
        except Exception as e:
            print(f"⚠️ Error deleting image files: {e}")

        cursor.execute("DELETE FROM fitness_plans WHERE analysis_id = %s", (analysis_id,))
        cursor.execute(
            "DELETE FROM analyses WHERE id = %s AND user_id = %s",
            (analysis_id, current_user.id),
        )
        db.commit()
        cursor.close()
        db.close()

        print(f"✅ Analysis {analysis_id} deleted successfully")
        return {"message": "Analysis deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting analysis: {str(e)}")
