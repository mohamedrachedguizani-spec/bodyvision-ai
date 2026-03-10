"""
Routes du coach virtuel intelligent + gestion des objectifs.
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from typing import Optional
import time
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_user_from_header
from app.models import User
from app.coach_services import coach_services

router = APIRouter(prefix="/coach", tags=["Coach"])


# ══════════════════════════════════════════════════════════════
#  INTERACTION
# ══════════════════════════════════════════════════════════════

@router.post("/transcribe")
async def coach_transcribe(audio: UploadFile = File(...)):
    """Transcrit l'audio de l'utilisateur via Whisper."""
    return await coach_services.transcribe_audio(audio)


@router.post("/interact")
async def coach_interact(
    query: str = Body(...),
    lang: str = Body(...),
    session_id: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user_from_header),
):
    """Réponse intelligente du coach (après transcription audio)."""
    response_text = await coach_services.generate_coach_response(
        query, lang, current_user, session_id
    )
    return {
        "response": response_text,
        "session_id": session_id or f"sess_{int(time.time())}",
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/text-interact")
async def coach_text_interact(
    query: str = Body(..., embed=True),
    session_id: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user_from_header),
):
    """Réponse intelligente du coach à partir d'un message texte."""
    # Détection de langue
    lower = query.lower()
    if any(w in lower for w in ("hello", "hi", "thanks", "yes", "no", "how", "why", "gym")):
        lang = "en"
    elif any(w in query for w in ("شكرا", "مرحبا", "كيف", "نعم", "لا", "رياضة")):
        lang = "ar"
    else:
        lang = "fr"

    response_text = await coach_services.generate_coach_response(
        query, lang, current_user, session_id
    )
    return {
        "response": response_text,
        "session_id": session_id or f"sess_{int(time.time())}",
        "language": lang,
    }


# ══════════════════════════════════════════════════════════════
#  HISTORIQUE
# ══════════════════════════════════════════════════════════════

@router.get("/conversation-history")
async def get_conversation_history(
    days: int = 30,
    current_user: User = Depends(get_current_user_from_header),
):
    """Liste des sessions récentes."""
    history = coach_services.get_conversation_history(current_user.id, days)
    return {"conversations": history, "total": len(history), "days": days}


@router.get("/session/{session_id}")
async def get_session_details(
    session_id: str,
    current_user: User = Depends(get_current_user_from_header),
):
    """Messages d'une session spécifique."""
    messages = coach_services.get_session_messages(current_user.id, session_id)
    return {"session_id": session_id, "messages": messages, "count": len(messages)}


# ══════════════════════════════════════════════════════════════
#  OBJECTIFS
# ══════════════════════════════════════════════════════════════

@router.get("/goals")
async def get_goals(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user_from_header),
):
    """Liste les objectifs de l'utilisateur (filtrable par statut)."""
    goals = coach_services.get_goals(current_user.id, status)
    return {"goals": goals, "total": len(goals)}


@router.post("/goals")
async def create_goal(
    goal_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """
    Crée un nouvel objectif.

    Body attendu :
      {
        "description": "Perdre 5 kg",
        "goal_type": "weight_loss",      // weight_loss | muscle_gain | posture | endurance | flexibility | nutrition | general
        "target_value": "75 kg",
        "current_value": "80 kg",        // optionnel
        "deadline": "2026-06-01"         // optionnel, format YYYY-MM-DD
      }
    """
    if not goal_data.get("description"):
        raise HTTPException(status_code=400, detail="La description est obligatoire")
    try:
        result = coach_services.save_goal(current_user.id, goal_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/goals/{goal_id}")
async def update_goal(
    goal_id: int,
    updates: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """Met à jour un objectif (statut, valeur actuelle, etc.)."""
    try:
        result = coach_services.update_goal(current_user.id, goal_id, updates)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user_from_header),
):
    """Supprime un objectif."""
    try:
        result = coach_services.delete_goal(current_user.id, goal_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user_from_header),
):
    """Supprime une conversation (session) entière."""
    try:
        result = coach_services.delete_session(current_user.id, session_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ══════════════════════════════════════════════════════════════
#  ADMINISTRATION
# ══════════════════════════════════════════════════════════════

@router.delete("/cleanup")
async def cleanup_conversations(
    current_user: User = Depends(get_current_user_from_header),
):
    """Archive les vieilles conversations (> 90 jours) — admin uniquement."""
    if current_user.email != "admin@example.com":
        raise HTTPException(status_code=403, detail="Non autorisé")
    cleaned = coach_services.cleanup_old_conversations()
    return {
        "message": f"Conversations archivées : {cleaned} messages",
        "cleaned_count": cleaned,
    }


@router.get("/user-summary")
async def get_user_summary(
    current_user: User = Depends(get_current_user_from_header),
):
    """Résumé utilisateur : stats coaching + objectifs."""
    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cursor = db.cursor(dictionary=True)

        # Dernière analyse
        cursor.execute(
            "SELECT analysis_data, created_at FROM analyses "
            "WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (current_user.id,),
        )
        analysis = cursor.fetchone()

        # Plan fitness actif
        cursor.execute(
            "SELECT fp.plan_type, fp.created_at "
            "FROM fitness_plans fp "
            "JOIN analyses a ON fp.analysis_id = a.id "
            "WHERE a.user_id = %s ORDER BY fp.created_at DESC LIMIT 1",
            (current_user.id,),
        )
        plan_row = cursor.fetchone()

        # Stats conversations
        cursor.execute(
            "SELECT COUNT(DISTINCT session_id) as session_count, "
            "COUNT(*) as total_messages "
            "FROM conversation_memory "
            "WHERE user_id = %s AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
            (current_user.id,),
        )
        stats = cursor.fetchone()

        # Objectifs actifs
        cursor.execute(
            "SELECT COUNT(*) as active_goals FROM user_goals "
            "WHERE user_id = %s AND status = 'active'",
            (current_user.id,),
        )
        goal_stats = cursor.fetchone()

        cursor.close()

        return {
            "user_id": current_user.id,
            "name": f"{current_user.first_name} {current_user.last_name}",
            "stats": stats or {},
            "active_goals": goal_stats.get("active_goals", 0) if goal_stats else 0,
            "has_recent_analysis": analysis is not None,
            "has_fitness_plan": plan_row is not None,
            "fitness_plan_type": plan_row["plan_type"] if plan_row else None,
            "fitness_plan_date": plan_row["created_at"].strftime("%d/%m/%Y") if plan_row and plan_row.get("created_at") else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching summary: {str(e)}")
    finally:
        try:
            db.close()
        except Exception:
            pass
