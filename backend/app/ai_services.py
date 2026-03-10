import os
import json
from groq import Groq
from fastapi import HTTPException
from typing import Dict, Any
from dotenv import load_dotenv

from app.body_analysis_engine import body_analysis_engine
from app.fitness_plan_engine import fitness_plan_engine

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
                    "yolo_confidence": yolo_classification.get('confidence', 0),
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
        except Exception:
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
        except Exception:
            return "N/A"
    
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
        """
        Génère un plan fitness intelligent, multi-phases, personnalisé et robuste.
        Utilise le FitnessPlanEngine pour les calculs déterministes puis Groq pour
        enrichir les recommandations avec du contexte naturel.
        """
        try:
            print("🎯 Generating intelligent multi-phase fitness plan...")

            # 1. Construire le profil athlétique complet
            profile = fitness_plan_engine.build_athletic_profile(user_data, analysis_data)
            print(f"   ✅ Athletic profile: level={profile['fitness_assessment']['level']}, goal={profile['fitness_assessment']['primary_goal']}")

            # 2. Générer les phases du programme
            phases = fitness_plan_engine.generate_phases(profile)
            total_weeks = sum(p["duration_weeks"] for p in phases)
            print(f"   ✅ Program phases: {len(phases)} phases, {total_weeks} weeks total")

            # 3. Générer le programme hebdomadaire détaillé pour la phase principale
            main_phase = next(
                (p for p in phases if p.get("training_split") not in ("evaluation",)),
                phases[0],
            )
            weekly_program = fitness_plan_engine.generate_weekly_program(profile, main_phase)
            print(f"   ✅ Weekly program: {weekly_program.get('split_type', 'N/A')}")

            # 4. Stratégie nutritionnelle
            nutrition = fitness_plan_engine.generate_nutrition_strategy(profile, main_phase)
            print(f"   ✅ Nutrition strategy generated")

            # 5. Protocole de récupération
            recovery = fitness_plan_engine.generate_recovery_protocol(profile)
            print(f"   ✅ Recovery protocol generated")

            # 6. Objectifs SMART
            smart_goals = fitness_plan_engine.generate_smart_goals(profile, phases)
            print(f"   ✅ SMART goals generated")

            # 7. Plan de monitoring
            monitoring = fitness_plan_engine.generate_monitoring_plan(profile)
            print(f"   ✅ Monitoring plan generated")

            # 8. Enrichir avec Groq (motivation, conseils personnalisés)
            ai_insights = await self._generate_ai_insights_with_groq(profile, phases)
            print(f"   ✅ AI insights generated")

            # Assembler le plan complet
            fitness_plan = {
                "plan_metadata": {
                    "version": "3.0-intelligent",
                    "generated_at": __import__("datetime").datetime.now().isoformat(),
                    "total_duration_weeks": total_weeks,
                    "total_phases": len(phases),
                    "fitness_level": profile["fitness_assessment"]["level"],
                    "primary_goal": profile["fitness_assessment"]["primary_goal"],
                },
                "athletic_profile": {
                    "current_status": self._format_status_summary(profile),
                    "body_composition_summary": profile["body_composition"],
                    "energy_metrics": profile["energy_metrics"],
                    "posture_profile": profile["posture_profile"],
                    "strengths": self._identify_strengths(profile),
                    "areas_to_improve": self._identify_weaknesses(profile),
                    "ideal_weight": f"{profile['fitness_assessment']['ideal_weight_kg']} kg",
                    "weight_adjustment": f"{profile['fitness_assessment']['weight_delta_kg']:+.1f} kg",
                },
                "smart_goals": smart_goals,
                "program_phases": [
                    {
                        **phase,
                        "weekly_program": (
                            fitness_plan_engine.generate_weekly_program(profile, phase)
                            if phase.get("training_split") != "evaluation"
                            else fitness_plan_engine.generate_weekly_program(profile, phase)
                        ),
                    }
                    for phase in phases
                ],
                "current_phase_detail": {
                    "phase_info": main_phase,
                    "weekly_program": weekly_program,
                },
                "nutrition_strategy": nutrition,
                "recovery_protocol": recovery,
                "monitoring_plan": monitoring,
                "strength_standards": profile.get("strength_targets", {}),
                "ai_coaching_insights": ai_insights,
            }

            print(f"✅ Intelligent fitness plan generated: {len(phases)} phases, {total_weeks} weeks")
            return {"fitness_plan": fitness_plan}

        except Exception as e:
            print(f"❌ Fitness plan generation error: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fallback : utiliser le moteur sans Groq
            try:
                profile = fitness_plan_engine.build_athletic_profile(user_data, analysis_data)
                phases = fitness_plan_engine.generate_phases(profile)
                main_phase = phases[0] if phases else {"training_split": "full_body"}
                return {
                    "fitness_plan": {
                        "plan_metadata": {
                            "version": "3.0-fallback",
                            "total_duration_weeks": sum(p["duration_weeks"] for p in phases),
                            "total_phases": len(phases),
                            "fitness_level": profile["fitness_assessment"]["level"],
                            "primary_goal": profile["fitness_assessment"]["primary_goal"],
                        },
                        "athletic_profile": {
                            "current_status": self._format_status_summary(profile),
                            "body_composition_summary": profile["body_composition"],
                            "energy_metrics": profile["energy_metrics"],
                            "posture_profile": profile["posture_profile"],
                            "strengths": self._identify_strengths(profile),
                            "areas_to_improve": self._identify_weaknesses(profile),
                        },
                        "smart_goals": fitness_plan_engine.generate_smart_goals(profile, phases),
                        "program_phases": phases,
                        "current_phase_detail": {
                            "phase_info": main_phase,
                            "weekly_program": fitness_plan_engine.generate_weekly_program(profile, main_phase),
                        },
                        "nutrition_strategy": fitness_plan_engine.generate_nutrition_strategy(profile, main_phase),
                        "recovery_protocol": fitness_plan_engine.generate_recovery_protocol(profile),
                        "monitoring_plan": fitness_plan_engine.generate_monitoring_plan(profile),
                        "strength_standards": profile.get("strength_targets", {}),
                        "ai_coaching_insights": {"motivation": "Plan généré sans enrichissement IA — toutes les données sont basées sur des formules scientifiques."},
                    }
                }
            except Exception as fallback_err:
                print(f"❌ Fallback also failed: {fallback_err}")
                return {
                    "fitness_plan": {
                        "error": "Impossible de générer le plan fitness",
                        "recommendation": "Veuillez réessayer ou contacter le support.",
                    }
                }

    def _format_status_summary(self, profile: Dict[str, Any]) -> str:
        level_labels = {"beginner": "Débutant", "intermediate": "Intermédiaire", "advanced": "Avancé"}
        goal_labels = {
            "fat_loss": "Perte de graisse",
            "muscle_gain": "Prise de masse musculaire",
            "recomposition": "Recomposition corporelle",
            "posture_correction": "Correction posturale",
            "maintenance": "Maintien & Optimisation",
            "athletic_performance": "Performance athlétique",
        }
        level = level_labels.get(profile["fitness_assessment"]["level"], profile["fitness_assessment"]["level"])
        goal = goal_labels.get(profile["fitness_assessment"]["primary_goal"], profile["fitness_assessment"]["primary_goal"])
        bmi = profile["user_metrics"]["bmi"]
        fat = profile["body_composition"]["body_fat_percentage"]
        return (
            f"Niveau {level} • Objectif principal : {goal} • "
            f"IMC {bmi} • Masse grasse {fat}% • "
            f"Score postural {profile['posture_profile']['score']}/100"
        )

    def _identify_strengths(self, profile: Dict[str, Any]) -> list:
        strengths = []
        if profile["posture_profile"]["score"] >= 80:
            strengths.append("Excellente posture corporelle")
        fat = profile["body_composition"]["fat_category"]
        if fat in ("Athlétique", "Fitness"):
            strengths.append(f"Composition corporelle {fat.lower()}")
        ratio = profile["body_composition"]["muscle_to_fat_ratio"]
        if ratio >= 2.5:
            strengths.append(f"Excellent ratio muscle/graisse ({ratio}:1)")
        if profile["user_metrics"]["age"] < 30:
            strengths.append("Potentiel de progression élevé (âge favorable)")
        if not strengths:
            strengths.append("Base solide pour progresser")
            strengths.append("Potentiel d'amélioration significatif dans tous les domaines")
        return strengths

    def _identify_weaknesses(self, profile: Dict[str, Any]) -> list:
        weaknesses = []
        if profile["posture_profile"]["needs_correction"]:
            weaknesses.append(f"Posture à corriger (score {profile['posture_profile']['score']}/100)")
        if profile["posture_profile"]["critical_issues"]:
            weaknesses.extend(profile["posture_profile"]["critical_issues"][:2])
        fat = profile["body_composition"]["fat_category"]
        if fat == "Surpoids/Obèse":
            weaknesses.append("Masse grasse excessive à réduire")
        elif fat == "Moyen":
            weaknesses.append("Composition corporelle à optimiser")
        if profile["fitness_assessment"]["level"] == "beginner":
            weaknesses.append("Base de force à développer")
        if not weaknesses:
            weaknesses.append("Points faibles mineurs — focus sur l'optimisation")
        return weaknesses

    async def _generate_ai_insights_with_groq(
        self, profile: Dict[str, Any], phases: list
    ) -> Dict[str, Any]:
        """Enrichit le plan avec des insights IA personnalisés via Groq."""
        try:
            goal_labels = {
                "fat_loss": "perte de graisse",
                "muscle_gain": "prise de masse",
                "recomposition": "recomposition corporelle",
                "posture_correction": "correction posturale",
                "maintenance": "maintien et optimisation",
            }
            goal_fr = goal_labels.get(
                profile["fitness_assessment"]["primary_goal"], "amélioration physique"
            )

            prompt = f"""En tant que coach sportif expert, donne des conseils PERSONNALISÉS pour ce profil :

PROFIL:
- Sexe: {profile['user_metrics']['sex']}, Âge: {profile['user_metrics']['age']} ans
- Poids: {profile['user_metrics']['weight_kg']}kg, Taille: {profile['user_metrics']['height_cm']}cm
- IMC: {profile['user_metrics']['bmi']}, Graisse corporelle: {profile['body_composition']['body_fat_percentage']}%
- Masse musculaire: {profile['body_composition']['muscle_mass_kg']}kg
- Score postural: {profile['posture_profile']['score']}/100
- Niveau: {profile['fitness_assessment']['level']}
- Objectif: {goal_fr}
- Programme: {len(phases)} phases sur {sum(p['duration_weeks'] for p in phases)} semaines

Génère un JSON avec exactement cette structure:
{{
    "personalized_message": "Message motivant et personnalisé (2-3 phrases)",
    "top_3_priorities": ["priorité 1", "priorité 2", "priorité 3"],
    "common_mistakes_to_avoid": ["erreur 1", "erreur 2", "erreur 3"],
    "mindset_tips": ["conseil mental 1", "conseil mental 2", "conseil mental 3"],
    "expected_timeline": {{
        "first_results_visible": "quand les premiers résultats seront visibles",
        "significant_transformation": "quand une transformation significative sera notable",
        "lifestyle_integration": "quand le mode de vie sera pleinement intégré"
    }},
    "weekly_motivation_strategy": "stratégie hebdomadaire pour maintenir la motivation",
    "plateau_breaking_tips": ["conseil anti-plateau 1", "conseil anti-plateau 2"]
}}"""

            completion = self.groq_client.chat.completions.create(
                model=self.groq_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un coach sportif expert et bienveillant. Réponds en JSON valide uniquement. Sois concret, motivant et personnalisé.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"⚠️ AI insights generation failed: {e}")
            return {
                "personalized_message": "Votre plan est prêt ! Chaque jour d'effort vous rapproche de vos objectifs.",
                "top_3_priorities": [
                    "Régularité avant intensité",
                    "Nutrition adaptée à vos objectifs",
                    "Repos et récupération suffisants",
                ],
                "common_mistakes_to_avoid": [
                    "Vouloir aller trop vite",
                    "Négliger l'alimentation",
                    "Ignorer les signes de fatigue",
                ],
                "mindset_tips": [
                    "Comparez-vous à vous-même d'hier, pas aux autres",
                    "Le progrès n'est pas linéaire — acceptez les fluctuations",
                    "Célébrez chaque petite victoire",
                ],
            }
    
    async def _get_fallback_analysis(
        self, user_data: Dict[str, Any], image_path: str = None
    ) -> Dict[str, Any]:
        """
        Fallback unique et consolidé.
        Tente d'abord une analyse basique (YOLO + MediaPipe), sinon
        retourne un résultat minimal basé sur les données utilisateur.
        """
        # Niveau 1 : analyse basique avec les moteurs
        if image_path:
            try:
                yolo = body_analysis_engine.analyze_with_yolo(image_path)
                posture = body_analysis_engine.analyze_posture_with_mediapipe(image_path)
                comp = body_analysis_engine.analyze_body_composition(user_data, yolo)
                return {
                    "posture_analysis": posture,
                    "body_composition_complete": {
                        "basic_metrics": {
                            "weight": f"{user_data.get('weight', 'N/A')} kg",
                            "height": f"{user_data.get('height', 'N/A')} cm",
                            "bmi": f"{comp.get('bmi', 'N/A')}",
                            "body_composition_class": comp.get("body_composition_class", "Indéterminé"),
                        },
                        "fat_analysis": {
                            "body_fat_percentage": f"{comp.get('body_fat_percentage', 'N/A')}%",
                            "body_fat_kg": f"{comp.get('body_fat_kg', 'N/A')} kg",
                        },
                        "muscle_analysis": {
                            "skeletal_muscle_mass_kg": f"{comp.get('skeletal_muscle_mass_kg', 'N/A')} kg",
                        },
                    },
                    "yolo_detection": yolo,
                    "muscle_analysis": body_analysis_engine._get_default_muscle_analysis(),
                    "fitness_recommendations": body_analysis_engine.get_detailed_recommendations(posture, comp),
                    "health_assessment": body_analysis_engine._get_default_health_assessment(),
                    "analysis_metadata": {"engine_used": "Fallback (YOLOv8 + MediaPipe)"},
                }
            except Exception as e:
                print(f"⚠️ Fallback basique échoué : {e}")

        # Niveau 2 : données utilisateur seules
        bmi = None
        if user_data.get("weight") and user_data.get("height"):
            h = user_data["height"] / 100
            bmi = round(user_data["weight"] / (h * h), 1)

        return {
            "posture_analysis": body_analysis_engine._get_default_posture_analysis(),
            "body_composition_complete": {
                "basic_metrics": {
                    "weight": f"{user_data.get('weight', 'N/A')} kg",
                    "height": f"{user_data.get('height', 'N/A')} cm",
                    "bmi": f"{bmi or 'N/A'}",
                    "body_composition_class": "Indéterminé",
                },
            },
            "yolo_detection": {"detected_class": "Non détecté"},
            "muscle_analysis": body_analysis_engine._get_default_muscle_analysis(),
            "fitness_recommendations": {
                "strength_training": ["Exercices de base recommandés 3×/semaine"],
                "flexibility_work": ["Étirements quotidiens 10 min"],
                "posture_correction": ["Surveillance posturale quotidienne"],
            },
            "health_assessment": body_analysis_engine._get_default_health_assessment(),
        }

# Instance globale
ai_services = AIServices()

# Fonctions d'interface pour FastAPI
analyze_body_image = ai_services.analyze_body_image
generate_fitness_plan = ai_services.generate_fitness_plan