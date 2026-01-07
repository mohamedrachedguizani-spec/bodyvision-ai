from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, Dict
import os
import json
import uuid
from dotenv import load_dotenv
from datetime import datetime

from app.database import get_db
from app.auth import get_current_user, create_user, login_user,verify_password,get_password_hash
from app.ai_services import analyze_body_image, generate_fitness_plan
from app.models import User, UserCreate, UserLogin
from app.body_analysis_engine import body_analysis_engine
from fastapi import HTTPException, status
import shutil

load_dotenv()

app = FastAPI(title="BodyVision AI API - Enhanced Multi-View Version")

# CORS pour React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Créer le dossier uploads s'il n'existe pas
os.makedirs("uploads", exist_ok=True)

# Monter le dossier uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/register")
async def register(user_data: UserCreate):
    return create_user(user_data)

@app.post("/login")
async def login(user_data: UserLogin):
    return login_user(user_data)

async def get_current_user_from_header(authorization: Optional[str] = Header(None)):
    """Dépendance pour récupérer l'utilisateur depuis le header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        return await get_current_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

def create_merged_posture_analysis(front_analysis: Dict, posture_analyses: Dict, comprehensive_analysis: Dict) -> Dict:
    """
    Crée une analyse posturale fusionnée à partir de toutes les vues
    """
    merged = front_analysis.copy() if front_analysis else {}
    
    if not comprehensive_analysis:
        return merged
    
    # Mettre à jour le score et le grade avec la fusion
    merged["posture_score"] = comprehensive_analysis.get("comprehensive_posture_score", merged.get("posture_score", 0))
    merged["posture_grade"] = comprehensive_analysis.get("comprehensive_grade", merged.get("posture_grade", "À évaluer"))
    
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
        all_issues.append({
            "issue": problem.get("description", ""),
            "severity": problem.get("severity", "Moyenne"),
            "impact": problem.get("impact", ""),
            "priority": "Haute",
            "detected_in_view": "multi-view",
            "view_type": "comprehensive"
        })
    
    merged["detected_issues"] = all_issues
    merged["primary_postural_problems"] = primary_problems
    
    # Ajouter les recommandations prioritaires
    priority_recommendations = comprehensive_analysis.get("recommendations_priority", [])
    if priority_recommendations:
        if "improvement_recommendations" not in merged:
            merged["improvement_recommendations"] = []
        
        # Ajouter les recommandations prioritaires en premier
        merged["improvement_recommendations"] = priority_recommendations + merged.get("improvement_recommendations", [])
    
    # Métadonnées de fusion
    merged["analysis_method"] = f"Fusion multi-vues intelligente ({len(posture_analyses)} vues)"
    merged["confidence"] = comprehensive_analysis.get("analysis_confidence", "Moyenne")
    merged["views_analyzed"] = list(posture_analyses.keys())
    merged["view_contributions"] = comprehensive_analysis.get("view_contributions", {})
    
    return merged

@app.post("/analyze-body-comprehensive-enhanced")
async def analyze_body_comprehensive_enhanced(
    front_file: UploadFile = File(...),
    back_file: Optional[UploadFile] = File(None),
    side_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user_from_header),
    activity_level: Optional[str] = Body("moderate")
):
    """Analyse corporelle complète améliorée avec fusion intelligente multi-vues"""
    try:
        print(f"📥 Starting enhanced comprehensive analysis with multi-view fusion")
        
        # Sauvegarder les images
        image_paths = {}
        image_filenames = {}  # Stocker les noms de fichiers seulement
        
        for file_type, file in [("front", front_file), ("back", back_file), ("side", side_file)]:
            if file:
                if not file.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail=f"Le fichier {file_type} doit être une image")
                
                file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
                unique_filename = f"{current_user.id}_{file_type}_{uuid.uuid4()}.{file_extension}"
                file_location = f"uploads/{unique_filename}"
                
                with open(file_location, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)
                
                image_paths[file_type] = file_location
                image_filenames[file_type] = unique_filename  # Stocker juste le nom du fichier
                print(f"✅ {file_type} image saved: {file_location}")
        
        # Préparer les données utilisateur avec niveau d'activité
        user_data = {
            'weight': current_user.weight,
            'height': current_user.height,
            'age': current_user.age,
            'sex': current_user.sex,
            'activity_level': activity_level
        }
        
        # Utiliser l'image frontale pour l'analyse principale
        main_image_path = image_paths.get("front")
        if not main_image_path:
            raise HTTPException(status_code=400, detail="Photo frontale requise")
        
        # ANALYSE MULTI-VUES AVEC FUSION INTELLIGENTE
        print("🔄 Starting comprehensive multi-view analysis with intelligent fusion...")
        
        # 1. Analyse frontale complète
        print("🔍 Processing front view comprehensive analysis...")
        front_analysis = await analyze_body_image(main_image_path, current_user.id, user_data)
        
        # 2. Dictionnaire pour stocker toutes les analyses posturales
        posture_analyses = {
            "front": front_analysis.get("posture_analysis", {})
        }
        
        # 3. Analyser les vues supplémentaires si disponibles
        for view_type in ["back", "side"]:
            if view_type in image_paths:
                print(f"🔍 Processing {view_type} view analysis...")
                try:
                    # Analyser la posture pour les vues supplémentaires
                    posture_analysis = body_analysis_engine.analyze_posture_with_mediapipe(
                        image_paths[view_type], view_type
                    )
                    
                    posture_analyses[view_type] = posture_analysis
                    
                    print(f"✅ {view_type} view analysis completed - Score: {posture_analysis.get('posture_score', 0)}")
                except Exception as e:
                    print(f"⚠️ {view_type} view analysis failed: {e}")
                    posture_analyses[view_type] = {
                        "posture_score": 0,
                        "posture_grade": "Non analysé",
                        "detected_issues": [],
                        "view_type": view_type,
                        "error": str(e)
                    }
        
        # 4. Fusion intelligente des analyses multi-vues
        print("🔄 Performing intelligent multi-view fusion...")
        comprehensive_analysis = body_analysis_engine.calculate_comprehensive_posture_score(posture_analyses)
        
        # 5. Créer une analyse finale fusionnée
        merged_posture_analysis = create_merged_posture_analysis(
            front_analysis.get("posture_analysis", {}), 
            posture_analyses, 
            comprehensive_analysis
        )
        
        # 6. Mettre à jour l'analyse frontale avec les résultats fusionnés
        front_analysis["posture_analysis"] = merged_posture_analysis
        
        # 7. Ajouter les données multi-vues
        front_analysis["multi_view_analysis"] = {
            "available_views": list(image_paths.keys()),
            "posture_scores": {k: v.get("posture_score", 0) for k, v in posture_analyses.items() if isinstance(v, dict)},
            "comprehensive_analysis": comprehensive_analysis,
            "analysis_confidence": comprehensive_analysis.get("analysis_confidence", "Moyenne") if comprehensive_analysis else "Moyenne",
            "views_analyzed_count": len(image_paths),
            "fusion_method": "Intelligent weighted fusion",
            "timestamp": datetime.now().isoformat()
        }
        
        analysis_result = front_analysis
        
        # Sauvegarder en base
        db = get_db()
        if db:
            cursor = db.cursor()
            
            analysis_json = json.dumps(analysis_result, ensure_ascii=False)
            
            # Sauvegarder les noms de fichiers seulement pour les URLs
            cursor.execute("""
                INSERT INTO analyses (user_id, image_path, analysis_data, multi_view_images)
                VALUES (%s, %s, %s, %s)
            """, (current_user.id, image_filenames.get("front"), analysis_json, json.dumps(image_filenames)))
            db.commit()
            analysis_id = cursor.lastrowid
            
            cursor.close()
            db.close()
            
            return {
                "analysis_id": analysis_id,
                "analysis": analysis_result,
                "image_urls": {k: f"/uploads/{v}" for k, v in image_filenames.items()},
                "message": f"Multi-view analysis completed with intelligent fusion ({len(image_paths)} views)",
                "analysis_confidence": comprehensive_analysis.get("analysis_confidence", "Moyenne") if comprehensive_analysis else "Moyenne",
                "comprehensive_score": comprehensive_analysis.get("comprehensive_posture_score", 0) if comprehensive_analysis else 0
            }
        else:
            raise HTTPException(status_code=500, detail="Database connection failed")
            
    except Exception as e:
        print(f"❌ Error in enhanced comprehensive analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")
    

@app.post("/generate-intelligent-fitness-plan")
async def generate_intelligent_fitness_plan(
    analysis_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header)
):
    """Générer un plan fitness intelligent et réaliste"""
    try:
        print(f"🎯 Generating intelligent fitness plan for user: {current_user.id}")
        
        analysis_id = analysis_data.get('analysis_id')
        if not analysis_id:
            raise HTTPException(status_code=400, detail="Analysis ID is required")
        
        print(f"📝 Analysis ID for intelligent fitness plan: {analysis_id}")
        
        # Vérifier que l'analyse appartient à l'utilisateur
        db = get_db()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id FROM analyses WHERE id = %s AND user_id = %s", (analysis_id, current_user.id))
        analysis = cursor.fetchone()
        
        if not analysis:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Préparer les données utilisateur
        user_data = {
            'weight': current_user.weight,
            'height': current_user.height,
            'age': current_user.age,
            'sex': current_user.sex
        }
        
        # Générer le plan intelligent
        result = await generate_fitness_plan(analysis_data, user_data)
        
        # Sauvegarder le plan dans la base de données
        if result and result.get("fitness_plan"):
            plan_json = json.dumps(result["fitness_plan"], ensure_ascii=False)
            
            cursor.execute("SELECT id FROM fitness_plans WHERE analysis_id = %s", (analysis_id,))
            existing_plan = cursor.fetchone()
            
            if existing_plan:
                cursor.execute("""
                    UPDATE fitness_plans 
                    SET plan_data = %s, created_at = CURRENT_TIMESTAMP,
                    plan_type = 'intelligent'
                    WHERE analysis_id = %s
                """, (plan_json, analysis_id))
            else:
                cursor.execute("""
                    INSERT INTO fitness_plans (analysis_id, plan_data, plan_type)
                    VALUES (%s, %s, 'intelligent')
                """, (analysis_id, plan_json))
            
            db.commit()
            print(f"✅ Intelligent fitness plan saved for analysis {analysis_id}")
        
        cursor.close()
        db.close()
        
        return result
        
    except Exception as e:
        print(f"❌ Error in generate-intelligent-fitness-plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-analyses")
async def get_user_analyses(current_user: User = Depends(get_current_user_from_header)):
    """Récupère toutes les analyses de l'utilisateur avec les plans fitness"""
    db = get_db()
    if db:
        cursor = db.cursor(dictionary=True)
        
        try:
            # Vérifier si la colonne plan_type existe
            cursor.execute("""
                SELECT COUNT(*) as column_exists 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'fitness_plans' 
                AND COLUMN_NAME = 'plan_type'
            """)
            
            column_exists = cursor.fetchone()['column_exists'] > 0
            
            # Construire la requête dynamiquement
            if column_exists:
                query = """
                    SELECT 
                        a.*, 
                        fp.plan_data as fitness_plan_data,
                        fp.plan_type
                    FROM analyses a 
                    LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
                    WHERE a.user_id = %s 
                    ORDER BY a.created_at DESC
                """
            else:
                query = """
                    SELECT 
                        a.*, 
                        fp.plan_data as fitness_plan_data
                    FROM analyses a 
                    LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
                    WHERE a.user_id = %s 
                    ORDER BY a.created_at DESC
                """
            
            cursor.execute(query, (current_user.id,))
            analyses = cursor.fetchall()
            
        except Exception as e:
            print(f"❌ Error executing query: {e}")
            # Fallback to simple query
            cursor.execute("""
                SELECT 
                    a.*, 
                    fp.plan_data as fitness_plan_data
                FROM analyses a 
                LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
                WHERE a.user_id = %s 
                ORDER BY a.created_at DESC
            """, (current_user.id,))
            analyses = cursor.fetchall()
        
        cursor.close()
        db.close()
        
        # Formater les analyses
        formatted_analyses = []
        for analysis in analyses:
            try:
                # Vérifier si analysis_data est déjà un dict ou une string JSON
                if isinstance(analysis["analysis_data"], str):
                    analysis_data = json.loads(analysis["analysis_data"])
                else:
                    analysis_data = analysis["analysis_data"]
                
                # Vérifier si fitness_plan_data existe et est valide
                fitness_plan = None
                if analysis.get("fitness_plan_data"):
                    try:
                        if isinstance(analysis["fitness_plan_data"], str):
                            fitness_plan = json.loads(analysis["fitness_plan_data"])
                        else:
                            fitness_plan = analysis["fitness_plan_data"]
                    except (json.JSONDecodeError, TypeError) as e:
                        print(f"❌ Error parsing fitness plan for analysis {analysis['id']}: {e}")
                        fitness_plan = None
                
                # Déterminer le plan_type (avec fallback)
                plan_type = analysis.get("plan_type", "basic")
                
                # Si pas de plan_type mais que fitness_plan existe, essayer de déterminer
                if plan_type == "basic" and fitness_plan:
                    try:
                        if isinstance(fitness_plan, str):
                            plan_json = json.loads(fitness_plan)
                        else:
                            plan_json = fitness_plan
                        
                        # Détecter si c'est un plan intelligent
                        if 'phase_1_microcycle_4_semaines' in plan_json or 'personal_profile_summary' in plan_json:
                            plan_type = "intelligent"
                    except:
                        pass
                
                # Traiter l'image_path
                image_path = analysis.get("image_path")
                
                # Traiter les multi_view_images
                multi_view_images = {}
                if analysis.get("multi_view_images"):
                    try:
                        if isinstance(analysis["multi_view_images"], str):
                            multi_view_images = json.loads(analysis["multi_view_images"])
                    except (json.JSONDecodeError, TypeError) as e:
                        print(f"❌ Error parsing multi_view_images: {e}")
                
                formatted_analysis = {
                    "id": analysis["id"],
                    "user_id": analysis["user_id"],
                    "image_path": image_path,  # Garder le nom de fichier seulement
                    "analysis_data": analysis_data,
                    "created_at": analysis["created_at"].isoformat() if analysis["created_at"] else None,
                    "fitness_plan": fitness_plan,
                    "has_fitness_plan": fitness_plan is not None,
                    "plan_type": plan_type,
                    "multi_view_images": multi_view_images  # Noms de fichiers seulement
                }
                formatted_analyses.append(formatted_analysis)
                
            except (json.JSONDecodeError, KeyError) as e:
                print(f"❌ Error parsing analysis {analysis.get('id')}: {e}")
                # Créer une analyse par défaut en cas d'erreur
                formatted_analysis = {
                    "id": analysis["id"],
                    "user_id": analysis["user_id"],
                    "image_path": analysis.get("image_path", ""),
                    "analysis_data": {
                        "error": "Données d'analyse corrompues",
                        "posture_analysis": {"posture_score": 0},
                        "body_composition_complete": {},
                        "muscle_analysis": {},
                        "fitness_recommendations": {},
                        "health_assessment": {}
                    },
                    "created_at": analysis["created_at"].isoformat() if analysis["created_at"] else None,
                    "fitness_plan": None,
                    "has_fitness_plan": False,
                    "plan_type": "basic",
                    "multi_view_images": {}
                }
                formatted_analyses.append(formatted_analysis)
        
        print(f"✅ Retrieved {len(formatted_analyses)} analyses for user {current_user.id}")
        return formatted_analyses
        
    raise HTTPException(status_code=500, detail="Database connection failed")

@app.get("/analysis/{analysis_id}")
async def get_analysis_details(
    analysis_id: int,
    current_user: User = Depends(get_current_user_from_header)
):
    """Récupère les détails complets d'une analyse spécifique"""
    db = get_db()
    if db:
        cursor = db.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                a.*, 
                fp.plan_data as fitness_plan_data,
                fp.plan_type
            FROM analyses a 
            LEFT JOIN fitness_plans fp ON a.id = fp.analysis_id
            WHERE a.id = %s AND a.user_id = %s
        """, (analysis_id, current_user.id))
        
        analysis = cursor.fetchone()
        cursor.close()
        db.close()
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        try:
            # Parser les données d'analyse
            if isinstance(analysis["analysis_data"], str):
                analysis_data = json.loads(analysis["analysis_data"])
            else:
                analysis_data = analysis["analysis_data"]
            
            # Parser le plan fitness s'il existe
            fitness_plan = None
            if analysis.get("fitness_plan_data"):
                try:
                    if isinstance(analysis["fitness_plan_data"], str):
                        fitness_plan = json.loads(analysis["fitness_plan_data"])
                    else:
                        fitness_plan = analysis["fitness_plan_data"]
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"❌ Error parsing fitness plan: {e}")
                    fitness_plan = None
            
            # Parser les images multi-vues
            multi_view_images = {}
            if analysis.get("multi_view_images"):
                try:
                    if isinstance(analysis["multi_view_images"], str):
                        multi_view_images = json.loads(analysis["multi_view_images"])
                        # Convertir en URLs complètes
                        for view_type, filename in multi_view_images.items():
                            if filename and not filename.startswith('http'):
                                multi_view_images[view_type] = f"/uploads/{filename}"
                except (json.JSONDecodeError, TypeError) as e:
                    print(f"❌ Error parsing multi_view_images: {e}")
            
            # Créer l'URL pour l'image principale
            image_path = analysis.get("image_path")
            if image_path and not image_path.startswith('http'):
                image_path = f"/uploads/{image_path}"
            
            return {
                "id": analysis["id"],
                "user_id": analysis["user_id"],
                "image_path": image_path,
                "analysis_data": analysis_data,
                "created_at": analysis["created_at"].isoformat() if analysis["created_at"] else None,
                "fitness_plan": fitness_plan,
                "has_fitness_plan": fitness_plan is not None,
                "plan_type": analysis.get("plan_type", "basic"),
                "multi_view_images": multi_view_images
            }
            
        except (json.JSONDecodeError, KeyError) as e:
            print(f"❌ Error parsing analysis details: {e}")
            raise HTTPException(status_code=500, detail="Error parsing analysis data")
    
    raise HTTPException(status_code=500, detail="Database connection failed")


@app.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user_from_header)
):
    """Supprime une analyse spécifique"""
    try:
        print(f"🗑️ Deleting analysis {analysis_id} for user {current_user.id}")
        
        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = db.cursor(dictionary=True)
        
        # Vérifier que l'analyse appartient à l'utilisateur
        cursor.execute("""
            SELECT id, image_path, multi_view_images 
            FROM analyses 
            WHERE id = %s AND user_id = %s
        """, (analysis_id, current_user.id))
        
        analysis = cursor.fetchone()
        
        if not analysis:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Supprimer les fichiers d'images
        try:
            # Supprimer l'image principale
            if analysis.get("image_path"):
                image_path = analysis["image_path"]
                if isinstance(image_path, str) and not image_path.startswith('http'):
                    file_location = f"uploads/{image_path}"
                    if os.path.exists(file_location):
                        os.remove(file_location)
                        print(f"✅ Deleted main image: {file_location}")
            
            # Supprimer les images multi-vues
            if analysis.get("multi_view_images"):
                try:
                    if isinstance(analysis["multi_view_images"], str):
                        multi_view_images = json.loads(analysis["multi_view_images"])
                    else:
                        multi_view_images = analysis["multi_view_images"]
                    
                    for view_type, filename in multi_view_images.items():
                        if filename and isinstance(filename, str) and not filename.startswith('http'):
                            file_location = f"uploads/{filename}"
                            if os.path.exists(file_location):
                                os.remove(file_location)
                                print(f"✅ Deleted {view_type} image: {file_location}")
                except (json.JSONDecodeError, TypeError, ValueError) as e:
                    print(f"⚠️ Error parsing multi_view_images for deletion: {e}")
        except Exception as e:
            print(f"⚠️ Error deleting image files: {e}")
            # Continuer même si la suppression des fichiers échoue
        
        # Supprimer le plan fitness associé
        cursor.execute("DELETE FROM fitness_plans WHERE analysis_id = %s", (analysis_id,))
        
        # Supprimer l'analyse
        cursor.execute("DELETE FROM analyses WHERE id = %s AND user_id = %s", (analysis_id, current_user.id))
        
        db.commit()
        cursor.close()
        db.close()
        
        print(f"✅ Analysis {analysis_id} deleted successfully")
        return {"message": "Analysis deleted successfully"}
        
    except Exception as e:
        print(f"❌ Error deleting analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting analysis: {str(e)}")

@app.put("/update-profile")
async def update_user_profile(
    user_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header)
):
    """Met à jour les informations du profil utilisateur"""
    try:
        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = db.cursor()
        
        # Préparer les champs à mettre à jour
        update_fields = []
        update_values = []
        
        if "first_name" in user_data:
            update_fields.append("first_name = %s")
            update_values.append(user_data["first_name"])
        
        if "last_name" in user_data:
            update_fields.append("last_name = %s")
            update_values.append(user_data["last_name"])
        
        if "age" in user_data:
            update_fields.append("age = %s")
            update_values.append(user_data["age"])
        
        if "weight" in user_data:
            update_fields.append("weight = %s")
            update_values.append(user_data["weight"])
        
        if "height" in user_data:
            update_fields.append("height = %s")
            update_values.append(user_data["height"])
        
        if "sex" in user_data:
            update_fields.append("sex = %s")
            update_values.append(user_data["sex"])
        
        if not update_fields:
            cursor.close()
            db.close()
            return {"message": "No fields to update", "user": current_user.dict()}
        
        # Ajouter l'ID utilisateur
        update_values.append(current_user.id)
        
        # Exécuter la mise à jour
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        
        cursor.execute(query, tuple(update_values))
        db.commit()
        
        # Récupérer l'utilisateur mis à jour
        cursor.execute("""
            SELECT id, email, first_name, last_name, age, weight, height, sex 
            FROM users WHERE id = %s
        """, (current_user.id,))
        
        updated_user = cursor.fetchone()
        cursor.close()
        db.close()
        
        user_dict = {
            "id": updated_user[0],
            "email": updated_user[1],
            "first_name": updated_user[2],
            "last_name": updated_user[3],
            "age": updated_user[4],
            "weight": updated_user[5],
            "height": updated_user[6],
            "sex": updated_user[7] or 'male'
        }
        
        return {
            "message": "Profile updated successfully",
            "user": user_dict
        }
        
    except Exception as e:
        print(f"❌ Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

@app.put("/update-password")
async def update_user_password(
    password_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header)
):
    """Met à jour le mot de passe de l'utilisateur"""
    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        confirm_password = password_data.get("confirm_password")
        
        if not all([current_password, new_password, confirm_password]):
            raise HTTPException(
                status_code=400, 
                detail="Current password, new password and confirmation are required"
            )
        
        if new_password != confirm_password:
            raise HTTPException(
                status_code=400, 
                detail="New password and confirmation do not match"
            )
        
        if len(new_password) < 6:
            raise HTTPException(
                status_code=400, 
                detail="New password must be at least 6 characters long"
            )
        
        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        cursor = db.cursor(dictionary=True)
        
        # Récupérer le mot de passe actuel
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (current_user.id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        # Vérifier le mot de passe actuel
        if not verify_password(current_password, user["password_hash"]):
            cursor.close()
            db.close()
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Hasher le nouveau mot de passe
        new_hashed_password = get_password_hash(new_password)
        
        # Mettre à jour le mot de passe
        cursor.execute("""
            UPDATE users 
            SET password_hash = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (new_hashed_password, current_user.id))
        
        db.commit()
        cursor.close()
        db.close()
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating password: {str(e)}")


@app.get("/health")
async def health_check():
    """Endpoint de vérification de santé"""
    return {
        "status": "healthy",
        "service": "BodyVision AI API",
        "version": "2.1.0",
        "features": [
            "Enhanced multi-view body composition analysis",
            "Advanced posture scoring with intelligent fusion",
            "Intelligent fitness planning",
            "Multi-view image support with confidence scoring"
        ]
    }

@app.get("/")
async def root():
    return {
        "message": "BodyVision AI API is running",
        "version": "2.1.0",
        "endpoints": {
            "/register": "User registration",
            "/login": "User login",
            "/analyze-body-comprehensive-enhanced": "Enhanced multi-view body analysis",
            "/generate-intelligent-fitness-plan": "Intelligent fitness plan generation",
            "/user-analyses": "Get user analyses",
            "/analysis/{id}": "Get analysis details",
            "/health": "Health check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)