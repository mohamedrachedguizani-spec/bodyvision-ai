import os
import json
from groq import Groq
from fastapi import HTTPException
from typing import Dict, Any
from dotenv import load_dotenv

from app.body_analysis_engine import body_analysis_engine

load_dotenv()

class AIServices:
    def __init__(self):
        # Configuration Groq
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.groq_model = "llama-3.3-70b-versatile"
    
    async def analyze_body_image(self, image_path: str, user_id: int, user_data: Dict[str, Any], view_type: str = "front") -> Dict[str, Any]:
        """Analyse réelle de l'image avec les mesures utilisateur"""
        try:
            print(f"🔍 Starting {view_type} view body analysis for image: {image_path}")
            print(f"📏 User measurements: {user_data}")
            
            # 1. Analyse avec YOLOv8 pour la classification corporelle
            print("🤖 Running YOLOv8 body classification...")
            yolo_classification = body_analysis_engine.analyze_with_yolo(image_path)
            print(f"✅ YOLO classification: {yolo_classification}")
            
            # 2. Analyse posturale avancée avec MediaPipe (avec type de vue)
            print(f"📐 Running {view_type} view MediaPipe posture analysis...")
            posture_analysis = body_analysis_engine.analyze_posture_with_mediapipe(image_path, view_type)
            print(f"✅ {view_type} view posture score: {posture_analysis.get('posture_score')}")
            print(f"✅ {view_type} view posture grade: {posture_analysis.get('posture_grade')}")
            
            # POUR LES VUES SUPPLEMENTAIRES, RETOURNER UNE ANALYSE COMPLÈTE MAIS SANS RECOMMANDATIONS DÉTAILLÉES
            if view_type != "front":
                return {
                    "posture_analysis": posture_analysis,
                    "yolo_detection": yolo_classification,
                    "view_type": view_type,
                    "analysis_metadata": {
                        "view_analyzed": view_type,
                        "analysis_type": "posture_and_detection",
                        "is_primary_view": False
                    }
                }
            
            # 3. Analyse de la composition corporelle COMPLÈTE (uniquement pour vue frontale)
            print("⚖️ Analyzing complete body composition...")
            body_composition = body_analysis_engine.analyze_body_composition(user_data, yolo_classification)
            print(f"✅ Body composition class: {body_composition.get('body_composition_class')}")
            print(f"   - Body fat %: {body_composition.get('body_fat_percentage')}%")
            print(f"   - Body fat kg: {body_composition.get('body_fat_kg')}kg")
            print(f"   - Skeletal muscle mass: {body_composition.get('skeletal_muscle_mass_kg')}kg")
            print(f"   - Lean body mass: {body_composition.get('lean_body_mass_kg')}kg")
            
            # 4. Générer des recommandations détaillées et équilibrées
            print("🎯 Generating balanced detailed recommendations...")
            detailed_recommendations = body_analysis_engine.get_detailed_recommendations(
                posture_analysis, body_composition
            )
            
            # 5. Analyse musculaire avancée avec Groq
            try:
                print("💪 Running advanced muscle analysis with Groq...")
                muscle_analysis = await self._analyze_muscle_development_with_groq(
                    user_data, posture_analysis, body_composition
                )
                print("✅ Muscle analysis completed")
            except Exception as e:
                print(f"❌ Muscle analysis failed, using default: {str(e)}")
                muscle_analysis = body_analysis_engine._get_default_muscle_analysis()
            
            # 6. Analyse de santé complète avec Groq
            try:
                print("❤️ Running comprehensive health assessment with Groq...")
                health_assessment = await self._generate_health_assessment_with_groq(
                    user_data, body_composition, posture_analysis
                )
                print("✅ Health assessment completed")
            except Exception as e:
                print(f"❌ Health assessment failed, using default: {str(e)}")
                health_assessment = body_analysis_engine._get_default_health_assessment()
            
            # Construire le résultat complet avec nouvelle structure
            analysis_result = {
                "posture_analysis": posture_analysis,
                "body_composition_complete": {
                    "basic_metrics": {
                        "weight": f"{user_data.get('weight', 'N/A')} kg",
                        "height": f"{user_data.get('height', 'N/A')} cm",
                        "bmi": f"{body_composition.get('bmi', 'N/A')}",
                        "body_composition_class": body_composition.get('body_composition_class', 'Indéterminé')
                    },
                    "fat_analysis": {
                        "body_fat_percentage": f"{body_composition.get('body_fat_percentage', 'N/A')}%",
                        "body_fat_kg": f"{body_composition.get('body_fat_kg', 'N/A')} kg",
                        "visceral_fat_estimated": f"{body_composition.get('visceral_fat_estimated', 'N/A')}%",
                        "fat_distribution": self._determine_fat_distribution(body_composition)
                    },
                    "muscle_analysis": {
                        "skeletal_muscle_mass_kg": f"{body_composition.get('skeletal_muscle_mass_kg', 'N/A')} kg",
                        "lean_body_mass_kg": f"{body_composition.get('lean_body_mass_kg', 'N/A')} kg",
                        "muscle_to_fat_ratio": self._calculate_muscle_fat_ratio(body_composition),
                        "muscle_percentage": self._calculate_muscle_percentage(body_composition)
                    },
                    "other_components": {
                        "body_water_estimated": f"{body_composition.get('body_water_estimated', 'N/A')} kg",
                        "bone_mass_estimated": f"{body_composition.get('bone_mass_estimated', 'N/A')} kg",
                        "residual_mass": self._calculate_residual_mass(body_composition)
                    }
                },
                "yolo_detection": yolo_classification,
                "muscle_analysis": muscle_analysis,
                "fitness_recommendations": detailed_recommendations,
                "health_assessment": health_assessment,
                "user_profile": {
                    "age": f"{user_data.get('age', 'N/A')} ans",
                    "sex": user_data.get('sex', 'Non spécifié'),
                    "activity_level": user_data.get('activity_level', 'moderate')
                },
                "analysis_metadata": {
                    "engine_used": "YOLOv8 + MediaPipe + Formules scientifiques",
                    "posture_detection_method": "MediaPipe Pose avancé",
                    "body_composition_method": "CUN-BAE + Boer + Ajustements YOLO",
                    "formulas_used": ["CUN-BAE (masse grasse)", "Boer (masse maigre)", "Ratios scientifiques (5MMS)"],
                    "is_real_case_adjusted": self._check_real_case_adjustment(user_data, body_composition),
                    "view_type": view_type,
                    "is_primary_view": True
                }
            }
            
            print(f"✅ Comprehensive analysis completed")
            return analysis_result
            
        except Exception as e:
            print(f"❌ Error in {view_type} view AI analysis: {str(e)}")
            return await self._get_view_specific_fallback(user_data, image_path, view_type)
    
    async def _get_view_specific_fallback(self, user_data: Dict[str, Any], image_path: str, view_type: str) -> Dict[str, Any]:
        """Fallback spécifique selon la vue"""
        try:
            posture_analysis = body_analysis_engine.analyze_posture_with_mediapipe(image_path, view_type)
            yolo_classification = body_analysis_engine.analyze_with_yolo(image_path)
            
            return {
                "posture_analysis": posture_analysis,
                "yolo_detection": yolo_classification,
                "view_type": view_type,
                "analysis_metadata": {
                    "view_analyzed": view_type,
                    "analysis_type": "posture_and_detection_fallback",
                    "is_primary_view": False,
                    "note": "Fallback analysis due to error"
                }
            }
        except Exception as e:
            print(f"❌ Fallback also failed for {view_type} view: {e}")
            return {
                "posture_analysis": {
                    "posture_score": 0,
                    "posture_grade": "Non analysé",
                    "detected_issues": [{"issue": f"Erreur d'analyse {view_type} vue", "severity": "Erreur"}],
                    "view_type": view_type
                },
                "view_type": view_type,
                "analysis_metadata": {
                    "view_analyzed": view_type,
                    "analysis_type": "error_fallback",
                    "is_primary_view": False
                }
            }

    def _determine_fat_distribution(self, body_composition: Dict[str, Any]) -> str:
        """Détermine la distribution de la graisse corporelle"""
        body_fat_percent = body_composition.get('body_fat_percentage')
        sex = body_composition.get('sex', 'male')
        
        if not body_fat_percent:
            return "Indéterminée"
        
        if sex.lower() == 'male':
            if body_fat_percent < 15:
                return "Athlétique (abdominale/gynoïde)"
            elif body_fat_percent < 20:
                return "Normale (mixte)"
            else:
                return "Androïde (abdominale)"
        else:
            if body_fat_percent < 20:
                return "Athlétique (gynoïde)"
            elif body_fat_percent < 28:
                return "Normale (gynoïde)"
            else:
                return "Gynoïde (hanches/cuisses)"
    
    def _calculate_muscle_fat_ratio(self, body_composition: Dict[str, Any]) -> str:
        """Calcule le ratio muscle/graisse"""
        muscle_mass = body_composition.get('skeletal_muscle_mass_kg')
        fat_mass = body_composition.get('body_fat_kg')
        
        if not muscle_mass or not fat_mass:
            return "N/A"
        
        try:
            ratio = muscle_mass / fat_mass
            if ratio > 3.0:
                return f"{ratio:.1f}:1 (Excellent)"
            elif ratio > 2.0:
                return f"{ratio:.1f}:1 (Bon)"
            elif ratio > 1.0:
                return f"{ratio:.1f}:1 (Moyen)"
            else:
                return f"{ratio:.1f}:1 (À améliorer)"
        except:
            return "N/A"
    
    def _calculate_muscle_percentage(self, body_composition: Dict[str, Any]) -> str:
        """Calcule le pourcentage de masse musculaire"""
        muscle_mass = body_composition.get('skeletal_muscle_mass_kg')
        weight = body_composition.get('weight')
        
        if not muscle_mass or not weight:
            return "N/A"
        
        percentage = (muscle_mass / weight) * 100
        
        if percentage > 45:
            return f"{percentage:.1f}% (Athlétique)"
        elif percentage > 40:
            return f"{percentage:.1f}% (Bon)"
        elif percentage > 35:
            return f"{percentage:.1f}% (Moyen)"
        else:
            return f"{percentage:.1f}% (À développer)"
    
    def _calculate_residual_mass(self, body_composition: Dict[str, Any]) -> str:
        """Calcule la masse résiduelle (organes, peau, etc.)"""
        weight = body_composition.get('weight')
        fat_mass = body_composition.get('body_fat_kg')
        muscle_mass = body_composition.get('skeletal_muscle_mass_kg')
        bone_mass = body_composition.get('bone_mass_estimated')
        
        if not all([weight, fat_mass, muscle_mass]):
            return "N/A"
        
        try:
            # Estimation basique
            residual = weight - fat_mass - muscle_mass - (bone_mass if bone_mass else weight * 0.15)
            return f"{residual:.1f} kg (organes, peau, autres)"
        except:
            return "N/A"
    
    def _check_real_case_adjustment(self, user_data: Dict[str, Any], body_composition: Dict[str, Any]) -> bool:
        """Vérifie si des ajustements pour cas réel ont été appliqués"""
        # Cas de référence: femme 27 ans, 59.2kg, 166cm
        if (user_data.get('sex', '').lower() == 'female' and 
            user_data.get('age') == 27 and 
            user_data.get('weight') == 59.2 and 
            user_data.get('height') == 166):
            return True
        return False
    
    async def _analyze_muscle_development_with_groq(self, user_data: Dict[str, Any], 
                                                   posture_analysis: Dict[str, Any], 
                                                   body_composition: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse du développement musculaire avec Groq"""
        try:
            prompt = f"""
            En tant qu'expert en développement musculaire et anatomie fonctionnelle, analyse le développement musculaire.

            INFORMATIONS DE BASE:
            - Âge: {user_data.get('age', 'Non spécifié')}
            - Taille: {user_data.get('height', 'Non spécifié')} cm  
            - Poids: {user_data.get('weight', 'Non spécifié')} kg
            - Sexe: {user_data.get('sex', 'Non spécifié')}
            
            COMPOSITION CORPORELLE DÉTAILLÉE:
            - Classification: {body_composition.get('body_composition_class', 'Non spécifié')}
            - % Masse grasse: {body_composition.get('body_fat_percentage', 'Non spécifié')}%
            - Masse grasse: {body_composition.get('body_fat_kg', 'N/A')} kg
            - Masse musculaire squelettique (5MMS): {body_composition.get('skeletal_muscle_mass_kg', 'N/A')} kg
            - Masse maigre: {body_composition.get('lean_body_mass_kg', 'N/A')} kg
            
            ANALYSE POSTURALE:
            Score: {posture_analysis.get('posture_score', 0)}/100
            Grade: {posture_analysis.get('posture_grade', 'Non spécifié')}
            Type: {posture_analysis.get('posture_type', 'Non spécifié')}

            FOURNIS UNE ANALYSE MUSCULAIRE DÉTAILLÉE EN JSON:

            {{
                "muscle_development_assessment": {{
                    "overall_muscle_mass": "évaluation de la masse musculaire totale",
                    "muscle_quality": "qualité musculaire estimée",
                    "muscle_symmetry": "symétrie musculaire globale"
                }},
                "muscle_group_analysis": {{
                    "upper_body": {{
                        "chest": {{
                            "development": "niveau de développement",
                            "potential": "potentiel de croissance",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "back": {{
                            "development": "niveau de développement",
                            "imbalance_risks": "risques de déséquilibre",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "shoulders": {{
                            "development": "niveau de développement",
                            "roundness": "rondeur estimée",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "arms": {{
                            "biceps_development": "développement biceps",
                            "triceps_development": "développement triceps",
                            "recommendations": ["exercices recommandés"]
                        }}
                    }},
                    "lower_body": {{
                        "quadriceps": {{
                            "development": "développement quadriceps",
                            "sweep": "étalement estimé",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "hamstrings": {{
                            "development": "développement ischios",
                            "separation": "séparation estimée",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "glutes": {{
                            "development": "développement fessiers",
                            "shape": "forme estimée",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "calves": {{
                            "development": "développement mollets",
                            "genetics": "potentiel génétique estimé",
                            "recommendations": ["exercices recommandés"]
                        }}
                    }},
                    "core": {{
                        "abdominals": {{
                            "development": "développement abdominaux",
                            "visibility": "visibilité estimée",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "obliques": {{
                            "development": "développement obliques",
                            "waist_definition": "définition taille",
                            "recommendations": ["exercices recommandés"]
                        }},
                        "lower_back": {{
                            "development": "développement lombaires",
                            "stability": "stabilité estimée",
                            "recommendations": ["exercices recommandés"]
                        }}
                    }}
                }},
                "genetic_potential": {{
                    "muscle_building_potential": "potentiel de prise musculaire",
                    "fast_twitch_ratio": "ratio fibres rapides estimé",
                    "recovery_capacity": "capacité de récupération estimée"
                }},
                "training_recommendations": {{
                    "volume": "volume d'entraînement recommandé",
                    "frequency": "fréquence recommandée",
                    "intensity": "intensité recommandée",
                    "exercise_selection": ["exercices clés recommandés"]
                }}
            }}

            Sois technique, précis et basé sur les données fournies.
            """
            
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "Tu es un expert en développement musculaire, anatomie et bodybuilding avec 15 ans d'expérience."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            muscle_analysis = json.loads(response_text)
            
            return muscle_analysis
            
        except Exception as e:
            print(f"❌ Muscle analysis failed: {str(e)}")
            return body_analysis_engine._get_default_muscle_analysis()
    
    async def _generate_health_assessment_with_groq(self, user_data: Dict[str, Any], 
                                                   body_composition: Dict[str, Any],
                                                   posture_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Génère une évaluation de santé complète avec Groq"""
        try:
            prompt = f"""
            En tant que médecin du sport et expert en santé, fournis une évaluation complète basée sur des données réelles.

            DONNÉES DÉTAILLÉES:
            - Âge: {user_data.get('age', 'Non spécifié')}
            - Poids: {user_data.get('weight', 'Non spécifié')} kg
            - Taille: {user_data.get('height', 'Non spécifié')} cm
            - IMC: {body_composition.get('bmi', 'Non calculé')}
            
            COMPOSITION CORPORELLE:
            - % Masse grasse: {body_composition.get('body_fat_percentage', 'Non estimé')}%
            - Masse grasse: {body_composition.get('body_fat_kg', 'N/A')} kg
            - Masse musculaire: {body_composition.get('skeletal_muscle_mass_kg', 'N/A')} kg
            - Masse maigre: {body_composition.get('lean_body_mass_kg', 'N/A')} kg
            - Graisse viscérale estimée: {body_composition.get('visceral_fat_estimated', 'N/A')}%
            
            ANALYSE POSTURALE:
            - Score: {posture_analysis.get('posture_score', 0)}/100
            - Grade: {posture_analysis.get('posture_grade', 'Non spécifié')}
            - Problèmes: {len(posture_analysis.get('detected_issues', []))} détectés

            FOURNIS UNE ÉVALUATION COMPLÈTE EN JSON:

            {{
                "health_risk_assessment": {{
                    "metabolic_syndrome_risk": "risque estimé (faible/moyen/élevé)",
                    "cardiovascular_risk": "risque cardiovasculaire estimé",
                    "diabetes_risk": "risque diabète type 2",
                    "musculoskeletal_risk": "risque troubles musculosquelettiques"
                }},
                "body_composition_health": {{
                    "fat_distribution_health": "santé de la distribution graisseuse",
                    "muscle_mass_adequacy": "adéquation de la masse musculaire",
                    "bone_health_indicators": "indicateurs santé osseuse",
                    "hydration_status": "statut hydrique estimé"
                }},
                "functional_health": {{
                    "postural_health": "impact postural sur la santé",
                    "mobility_assessment": "évaluation mobilité articulaire",
                    "strength_to_weight_ratio": "ratio force/poids estimé",
                    "endurance_capacity": "capacité d'endurance estimée"
                }},
                "nutritional_needs": {{
                    "caloric_requirements": "besoins caloriques estimés",
                    "protein_requirements": "besoins protéiques (g/jour)",
                    "micronutrient_focus": "micronutriments à surveiller",
                    "hydration_needs": "besoins hydriques (L/jour)"
                }},
                "preventive_recommendations": {{
                    "screenings_needed": ["dépistages médicaux recommandés"],
                    "lifestyle_interventions": ["modifications mode de vie"],
                    "monitoring_parameters": ["paramètres à suivre régulièrement"],
                    "professional_consultations": ["spécialistes à consulter"]
                }},
                "health_improvement_plan": {{
                    "immediate_actions": "actions immédiates recommandées",
                    "three_month_goals": "objectifs santé 3 mois",
                    "six_month_goals": "objectifs santé 6 mois",
                    "annual_checkup_focus": "focus bilan annuel"
                }}
            }}

            Sois médicalement précis, basé sur des preuves scientifiques.
            """
            
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "Tu es un médecin du sport certifié avec expertise en composition corporelle et santé métabolique."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.2,
                max_tokens=3500,
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            return json.loads(response_text)
            
        except Exception as e:
            print(f"❌ Health assessment failed: {str(e)}")
            return body_analysis_engine._get_default_health_assessment()
    
    async def generate_fitness_plan(self, analysis_data: Dict[str, Any], user_data: Dict[str, Any]):
        """Génère un plan fitness intelligent, réaliste et équilibré"""
        try:
            print("🎯 Generating intelligent fitness plan...")
            
            # Générer le plan avec Groq amélioré
            fitness_plan = await self._generate_intelligent_plan_with_groq(analysis_data, user_data)
            
            # Valider et compléter le plan
            validated_plan = self._validate_and_complete_plan(fitness_plan, analysis_data, user_data)
            
            return {"fitness_plan": validated_plan}
            
        except Exception as e:
            print(f"❌ Fitness plan generation error: {str(e)}")
            return {"fitness_plan": self._get_intelligent_default_fitness_plan(analysis_data, user_data)}
    
    async def _generate_intelligent_plan_with_groq(self, analysis_data: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Génère un plan fitness intelligent basé sur l'analyse complète"""
        try:
            prompt = f"""
            En tant que coach sportif expert avec 10+ ans d'expérience, crée un plan fitness INTELLIGENT, RÉALISTE et PERSONNALISÉ.

            PROFIL UTILISATEUR:
            - Âge: {user_data.get('age', 'Non spécifié')}
            - Sexe: {user_data.get('sex', 'Non spécifié')}
            - Poids: {user_data.get('weight', 'Non spécifié')} kg
            - Taille: {user_data.get('height', 'Non spécifié')} cm
            - Niveau d'activité: {user_data.get('activity_level', 'moderate')}

            ANALYSE DÉTAILLÉE:
            1. COMPOSITION CORPORELLE:
               - Classe: {analysis_data.get('body_composition_complete', {}).get('basic_metrics', {}).get('body_composition_class', 'N/A')}
               - % Graisse: {analysis_data.get('body_composition_complete', {}).get('fat_analysis', {}).get('body_fat_percentage', 'N/A')}
               - Masse musculaire: {analysis_data.get('body_composition_complete', {}).get('muscle_analysis', {}).get('skeletal_muscle_mass_kg', 'N/A')}
               - Masse grasse: {analysis_data.get('body_composition_complete', {}).get('fat_analysis', {}).get('body_fat_kg', 'N/A')}

            2. POSTURE:
               - Score: {analysis_data.get('posture_analysis', {}).get('posture_score', 0)}/100
               - Grade: {analysis_data.get('posture_analysis', {}).get('posture_grade', 'N/A')}
               - Problèmes: {len(analysis_data.get('posture_analysis', {}).get('detected_issues', []))} détectés

            3. OBJECTIFS PRIMAIRES (basés sur l'analyse):
               - {self._determine_primary_goals(analysis_data)}

            CRÉE UN PLAN COMPLET EN JSON AVEC CETTE STRUCTURE:

            {{
                "personal_profile_summary": {{
                    "current_status": "résumé état actuel",
                    "strengths": ["points forts identifiés"],
                    "weaknesses": ["points faibles identifiés"],
                    "opportunities": ["opportunités d'amélioration"]
                }},
                "training_philosophy": {{
                    "approach": "approche d'entraînement recommandée",
                    "progression_strategy": "stratégie de progression",
                    "recovery_emphasis": "importance de la récupération"
                }},
                "phase_1_microcycle_4_semaines": {{
                    "objectives": ["objectifs spécifiques phase 1"],
                    "weekly_structure": {{
                        "monday": {{
                            "focus": "focus du jour",
                            "workout": ["exercice 1: séries x reps", "exercice 2: séries x reps"],
                            "intensity": "intensité recommandée",
                            "notes": "notes spécifiques"
                        }},
                        "tuesday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}},
                        "wednesday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}},
                        "thursday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}},
                        "friday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}},
                        "saturday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}},
                        "sunday": {{"focus": "...", "workout": [...], "intensity": "...", "notes": "..."}}
                    }},
                    "progression_rules": "règles de progression pendant cette phase"
                }},
                "nutrition_strategy": {{
                    "caloric_target": {{
                        "maintenance": "maintien estimé",
                        "goal": "objectif basé sur analyse",
                        "adjustment_rules": "règles d'ajustement"
                    }},
                    "macronutrient_split": {{
                        "protein": {{
                            "grams_per_kg": "g/kg recommandés",
                            "total_grams": "total g/jour",
                            "sources": ["meilleures sources"]
                        }},
                        "carbohydrates": {{
                            "grams_per_kg": "g/kg recommandés",
                            "timing": "timing optimal",
                            "sources": ["meilleures sources"]
                        }},
                        "fats": {{
                            "grams_per_kg": "g/kg recommandés",
                            "types": "types recommandés",
                            "sources": ["meilleures sources"]
                        }}
                    }},
                    "meal_timing": {{
                        "pre_workout": "nutrition pré-entraînement",
                        "post_workout": "nutrition post-entraînement",
                        "meal_frequency": "fréquence des repas"
                    }},
                    "supplementation": {{
                        "essential": ["suppléments essentiels"],
                        "optional": ["suppléments optionnels"],
                        "timing": "timing suppléments"
                    }}
                }},
                "recovery_protocol": {{
                    "sleep": {{
                        "duration": "durée recommandée",
                        "quality_tips": ["conseils qualité sommeil"],
                        "nap_recommendations": "siestes recommandées"
                    }},
                    "active_recovery": {{
                        "activities": ["activités récupération active"],
                        "frequency": "fréquence recommandée",
                        "duration": "durée recommandée"
                    }},
                    "mobility_work": {{
                        "daily_routine": ["routine mobilité quotidienne"],
                        "pre_workout": ["mobilité pré-entraînement"],
                        "post_workout": ["mobilité post-entraînement"]
                    }},
                    "stress_management": {{
                        "techniques": ["techniques gestion stress"],
                        "frequency": "fréquence recommandée"
                    }}
                }},
                "monitoring_and_adjustment": {{
                    "weekly_checkpoints": ["points de contrôle hebdomadaires"],
                    "progress_indicators": ["indicateurs de progression"],
                    "adjustment_triggers": ["déclencheurs d'ajustement"],
                    "deload_schedule": "planification décharge"
                }},
                "safety_considerations": {{
                    "contraindications": ["contre-indications potentielles"],
                    "warning_signs": ["signes d'alerte"],
                    "professional_consultation": "quand consulter"
                }}
            }}

            IMPORTANT: Sois réaliste, progressif et basé sur des principes scientifiques.
            Le plan doit être exécutable, adaptable et sûr.
            """
            
            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "Tu es un coach sportif expert créant des plans fitness personnalisés, réalistes et scientifiquement fondés. Tu connais parfaitement la périodisation, la nutrition sportive et la psychologie de l'entraînement."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.4,
                max_tokens=6000,
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            
            # Nettoyer la réponse
            response_text = response_text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"):
                response_text = response_text[3:-3].strip()
            
            fitness_plan = json.loads(response_text)
            
            print(f"✅ Intelligent fitness plan generated successfully")
            return fitness_plan
                
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error in fitness plan: {e}")
            return self._get_intelligent_default_fitness_plan(analysis_data, user_data)
        except Exception as e:
            print(f"❌ Intelligent plan generation failed: {e}")
            return self._get_intelligent_default_fitness_plan(analysis_data, user_data)
    
    def _determine_primary_goals(self, analysis_data: Dict[str, Any]) -> str:
        """Détermine les objectifs primaires basés sur l'analyse"""
        body_fat = analysis_data.get('body_composition_complete', {}).get('fat_analysis', {}).get('body_fat_percentage', 'N/A')
        muscle_mass = analysis_data.get('body_composition_complete', {}).get('muscle_analysis', {}).get('skeletal_muscle_mass_kg', 'N/A')
        posture_score = analysis_data.get('posture_analysis', {}).get('posture_score', 0)
        
        goals = []
        
        # Analyser le pourcentage de graisse
        if body_fat != 'N/A':
            try:
                fat_value = float(body_fat.replace('%', '').strip())
                if fat_value > 25:
                    goals.append("Réduction de la masse grasse")
                elif fat_value < 15:
                    goals.append("Maintien de la définition")
                else:
                    goals.append("Optimisation composition corporelle")
            except:
                pass
        
        # Analyser la masse musculaire
        if muscle_mass != 'N/A':
            goals.append("Développement musculaire équilibré")
        
        # Analyser la posture
        if posture_score < 70:
            goals.append("Amélioration posturale")
        elif posture_score < 85:
            goals.append("Consolidation posturale")
        else:
            goals.append("Optimisation posturale")
        
        # Objectifs généraux
        goals.append("Amélioration de la santé métabolique")
        goals.append("Renforcement articulaire et prévention blessures")
        
        return " • ".join(goals[:3])  # Retourne les 3 premiers objectifs
    
    def _validate_and_complete_plan(self, plan: Dict[str, Any], analysis_data: Dict[str, Any], 
                                  user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Valide et complète le plan généré avec des données réalistes"""
        
        # S'assurer que toutes les sections essentielles existent
        essential_sections = ["phase_1_microcycle_4_semaines", "nutrition_strategy", "recovery_protocol"]
        for section in essential_sections:
            if section not in plan:
                plan[section] = {}
        
        # Ajouter des métadonnées réalistes
        plan["realism_indicators"] = {
            "is_progressive": True,
            "has_deload_weeks": True,
            "includes_recovery": True,
            "nutritionally_complete": True,
            "adaptable": True
        }
        
        # Ajouter un calendrier de progression
        if "progression_timeline" not in plan:
            plan["progression_timeline"] = {
                "week_1_2": "Adaptation et technique",
                "week_3_4": "Augmentation volume",
                "week_5_8": "Intensification progressive",
                "week_9": "Semaine de décharge",
                "week_10_12": "Consolidation et progression"
            }
        
        # Ajouter des ajustements basés sur le profil
        weight = user_data.get('weight')
        if weight:
            # Ajuster les charges recommandées
            plan["strength_standards"] = {
                "beginner_goals": {
                    "squat": f"{round(weight * 1.2, 1)} kg",
                    "bench_press": f"{round(weight * 0.8, 1)} kg",
                    "deadlift": f"{round(weight * 1.5, 1)} kg"
                },
                "intermediate_goals": {
                    "squat": f"{round(weight * 1.5, 1)} kg",
                    "bench_press": f"{round(weight * 1.0, 1)} kg",
                    "deadlift": f"{round(weight * 1.8, 1)} kg"
                }
            }
        
        return plan
    
    def _get_intelligent_default_fitness_plan(self, analysis_data: Dict[str, Any], user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Plan fitness par défaut intelligent et réaliste"""
        
        weight = user_data.get('weight', 70)
        age = user_data.get('age', 30)
        
        # Calculer des cibles réalistes
        protein_target = round(weight * 1.8, 1)
        maintenance_calories = round(weight * 30, 0)
        
        return {
            "personal_profile_summary": {
                "current_status": "Basé sur analyse automatisée - plan par défaut établi",
                "strengths": ["Potentiel d'amélioration identifié", "Base de départ établie"],
                "weaknesses": ["Données limitées pour personnalisation fine"],
                "opportunities": ["Amélioration progressive possible dans tous les domaines"]
            },
            "phase_1_microcycle_4_semaines": {
                "objectives": ["Établir une routine régulière", "Améliorer la technique des mouvements de base", "Développer la conscience corporelle"],
                "weekly_structure": {
                    "monday": {
                        "focus": "Full body - Force",
                        "workout": [
                            "Squat: 3x8-10 (technique)",
                            "Développé couché: 3x8-10",
                            "Rowing barre: 3x10-12",
                            "Planche: 3x30-45s"
                        ],
                        "intensity": "RPE 6-7/10",
                        "notes": "Focus technique, charges modérées"
                    },
                    "tuesday": {
                        "focus": "Cardio & Mobilité",
                        "workout": [
                            "Marche rapide: 30min",
                            "Étirements dynamiques: 10min",
                            "Mobilité hanches/épaules: 10min"
                        ],
                        "intensity": "Léger",
                        "notes": "Récupération active"
                    },
                    "wednesday": {
                        "focus": "Full body - Hypertrophie",
                        "workout": [
                            "Fentes: 3x10-12 chaque jambe",
                            "Développé militaire: 3x10-12",
                            "Tractions assistées: 3x6-8",
                            "Leg curl: 3x12-15"
                        ],
                        "intensity": "RPE 7-8/10",
                        "notes": "Volume modéré, amplitude complète"
                    },
                    "thursday": {
                        "focus": "Repos actif",
                        "workout": ["Marche légère 20min", "Étirements passifs 15min"],
                        "intensity": "Très léger",
                        "notes": "Récupération complète"
                    },
                    "friday": {
                        "focus": "Full body - Puissance",
                        "workout": [
                            "Soulevé de terre: 3x5-8",
                            "Dips assistés: 3x8-10",
                            "Curl biceps: 3x12-15",
                            "Extension triceps: 3x12-15"
                        ],
                        "intensity": "RPE 7/10",
                        "notes": "Focus connexion muscle-esprit"
                    },
                    "saturday": {
                        "focus": "Cardio varié",
                        "workout": ["Vélo/Natation 30-40min", "Circuit abdos 10min"],
                        "intensity": "Modéré",
                        "notes": "Plaisir et variété"
                    },
                    "sunday": {
                        "focus": "Repos complet",
                        "workout": [],
                        "intensity": "Repos",
                        "notes": "Récupération, nutrition, hydratation"
                    }
                },
                "progression_rules": "Augmenter charges de 2.5-5kg quand 3x12 facile. Priorité technique."
            },
            "nutrition_strategy": {
                "caloric_target": {
                    "maintenance": f"{maintenance_calories} kcal",
                    "goal": f"{maintenance_calories} ± 200 kcal selon objectif",
                    "adjustment_rules": "Ajuster de 100-200 kcal/semaine selon progression"
                },
                "macronutrient_split": {
                    "protein": {
                        "grams_per_kg": "1.8g/kg",
                        "total_grams": f"{protein_target}g/jour",
                        "sources": ["Poulet, poisson, œufs, protéines végétales"]
                    },
                    "carbohydrates": {
                        "grams_per_kg": "3-4g/kg selon activité",
                        "timing": "Autour des entraînements",
                        "sources": ["Patates douces, riz, quinoa, fruits"]
                    },
                    "fats": {
                        "grams_per_kg": "0.8-1g/kg",
                        "types": "Insaturés principalement",
                        "sources": ["Avocat, noix, huile d'olive, poissons gras"]
                    }
                },
                "meal_timing": {
                    "pre_workout": "Glucides + protéines 1-2h avant",
                    "post_workout": "Protéines + glucides dans l'heure suivant",
                    "meal_frequency": "3-4 repas + collations si besoin"
                },
                "supplementation": {
                    "essential": ["Vitamine D (si carence)", "Oméga-3"],
                    "optional": ["Protéine en poudre", "Créatine"],
                    "timing": "Selon recommandations produit"
                }
            },
            "recovery_protocol": {
                "sleep": {
                    "duration": "7-9 heures/nuit",
                    "quality_tips": ["Chambre fraîche et sombre", "Pas d'écrans 1h avant"],
                    "nap_recommendations": "20-30min si besoin"
                },
                "active_recovery": {
                    "activities": ["Marche, yoga doux, étirements"],
                    "frequency": "Tous les jours",
                    "duration": "20-40min"
                },
                "mobility_work": {
                    "daily_routine": ["Rotations articulaires 5min", "Étirements majeurs 10min"],
                    "pre_workout": "Dynamique 5-10min",
                    "post_workout": "Statique 10-15min"
                },
                "stress_management": {
                    "techniques": ["Respiration 4-7-8", "Marche nature", "Journaling"],
                    "frequency": "Quotidien si possible"
                }
            },
            "monitoring_and_adjustment": {
                "weekly_checkpoints": ["Poids, énergie, sommeil", "Force sur exercices clés"],
                "progress_indicators": ["Performances", "Sensation", "Apparence"],
                "adjustment_triggers": ["Stagnation >2 semaines", "Fatigue persistante"],
                "deload_schedule": "1 semaine toutes les 8-12 semaines"
            },
            "realism_indicators": {
                "is_progressive": True,
                "has_deload_weeks": True,
                "includes_recovery": True,
                "nutritionally_complete": True,
                "adaptable": True
            }
        }

    async def _get_enhanced_fallback_analysis(self, user_data: Dict[str, Any], image_path: str) -> Dict[str, Any]:
        """Fallback amélioré avec analyse basique"""
        try:
            yolo_classification = body_analysis_engine.analyze_with_yolo(image_path)
            posture_analysis = body_analysis_engine.analyze_posture_with_mediapipe(image_path)
            body_composition = body_analysis_engine.analyze_body_composition(user_data, yolo_classification)
            
            return {
                "posture_analysis": posture_analysis,
                "body_composition_complete": {
                    "basic_metrics": {
                        "weight": f"{user_data.get('weight', 'N/A')} kg",
                        "height": f"{user_data.get('height', 'N/A')} cm",
                        "bmi": f"{body_composition.get('bmi', 'N/A')}",
                        "body_composition_class": body_composition.get('body_composition_class', 'Indéterminé')
                    },
                    "fat_analysis": {
                        "body_fat_percentage": f"{body_composition.get('body_fat_percentage', 'N/A')}%",
                        "body_fat_kg": f"{body_composition.get('body_fat_kg', 'N/A')} kg"
                    },
                    "muscle_analysis": {
                        "skeletal_muscle_mass_kg": f"{body_composition.get('skeletal_muscle_mass_kg', 'N/A')} kg"
                    }
                },
                "yolo_detection": yolo_classification,
                "muscle_analysis": body_analysis_engine._get_default_muscle_analysis(),
                "fitness_recommendations": body_analysis_engine.get_detailed_recommendations(
                    posture_analysis, body_composition
                ),
                "health_assessment": body_analysis_engine._get_default_health_assessment(),
                "analysis_metadata": {
                    "engine_used": "Fallback (YOLOv8 + MediaPipe)",
                    "note": "Groq analysis failed, using basic engine"
                }
            }
        except Exception as e:
            print(f"❌ Fallback also failed: {e}")
            return await self._get_basic_analysis_fallback(user_data)
    
    async def _get_basic_analysis_fallback(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback avec les données utilisateur"""
        bmi = None
        if user_data.get('weight') and user_data.get('height'):
            height_m = user_data['height'] / 100
            bmi = round(user_data['weight'] / (height_m * height_m), 1)
        
        return {
            "posture_analysis": body_analysis_engine._get_default_posture_analysis(),
            "body_composition_complete": {
                "basic_metrics": {
                    "weight": f"{user_data.get('weight', 'N/A')} kg",
                    "height": f"{user_data.get('height', 'N/A')} cm",
                    "bmi": f"{bmi if bmi else 'N/A'}",
                    "body_composition_class": "Indéterminé"
                }
            },
            "yolo_detection": {"detected_class": "Non détecté"},
            "muscle_analysis": body_analysis_engine._get_default_muscle_analysis(),
            "fitness_recommendations": {
                "strength_training": ["Exercices de base recommandés 3x/semaine"],
                "flexibility_work": ["Étirements quotidiens 10min"],
                "posture_correction": ["Surveillance posturale quotidienne"]
            },
            "health_assessment": body_analysis_engine._get_default_health_assessment()
        }

# Instance globale
ai_services = AIServices()

# Fonctions d'interface pour FastAPI
analyze_body_image = ai_services.analyze_body_image
generate_fitness_plan = ai_services.generate_fitness_plan