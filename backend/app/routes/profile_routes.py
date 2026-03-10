"""
Routes de gestion du profil utilisateur.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
import os
import json

from app.database import get_db
from app.dependencies import get_current_user_from_header
from app.models import User
from app.auth import verify_password, get_password_hash

router = APIRouter(tags=["Profile"])


@router.put("/update-profile")
async def update_user_profile(
    user_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """Met à jour les informations du profil utilisateur."""
    try:
        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = db.cursor()

        update_fields = []
        update_values = []

        for field in ("first_name", "last_name", "age", "weight", "height", "sex", "activity_level"):
            if field in user_data:
                update_fields.append(f"{field} = %s")
                update_values.append(user_data[field])

        if not update_fields:
            cursor.close()
            db.close()
            return {"message": "No fields to update", "user": current_user.dict()}

        update_values.append(current_user.id)

        query = f"""
            UPDATE users
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """
        cursor.execute(query, tuple(update_values))
        db.commit()

        cursor.execute(
            """
            SELECT id, email, first_name, last_name, age, weight, height, sex,
                   COALESCE(activity_level, 'moderate') AS activity_level
            FROM users WHERE id = %s
            """,
            (current_user.id,),
        )
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
            "sex": updated_user[7] or "male",
            "activity_level": updated_user[8] or "moderate",
        }

        return {"message": "Profile updated successfully", "user": user_dict}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")


@router.put("/update-password")
async def update_user_password(
    password_data: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """Met à jour le mot de passe de l'utilisateur."""
    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        confirm_password = password_data.get("confirm_password")

        if not all([current_password, new_password, confirm_password]):
            raise HTTPException(
                status_code=400,
                detail="Current password, new password and confirmation are required",
            )

        if new_password != confirm_password:
            raise HTTPException(
                status_code=400,
                detail="New password and confirmation do not match",
            )

        if len(new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters long",
            )

        db = get_db()
        if not db:
            raise HTTPException(status_code=500, detail="Database connection failed")

        cursor = db.cursor(dictionary=True)
        cursor.execute(
            "SELECT password_hash FROM users WHERE id = %s", (current_user.id,)
        )
        user = cursor.fetchone()

        if not user:
            cursor.close()
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(current_password, user["password_hash"]):
            cursor.close()
            db.close()
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        new_hashed_password = get_password_hash(new_password)

        cursor.execute(
            """
            UPDATE users
            SET password_hash = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (new_hashed_password, current_user.id),
        )
        db.commit()
        cursor.close()
        db.close()

        return {"message": "Password updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating password: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating password: {str(e)}")


@router.delete("/delete-account")
async def delete_user_account(
    body: dict = Body(...),
    current_user: User = Depends(get_current_user_from_header),
):
    """
    Supprime définitivement le compte utilisateur et toutes ses données associées.
    Requiert le mot de passe actuel pour confirmation.
    """
    password = body.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Le mot de passe est requis pour confirmer la suppression")

    db = get_db()
    if not db:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cursor = db.cursor(dictionary=True)

    try:
        # 1. Vérifier le mot de passe
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (current_user.id,))
        user_row = cursor.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")

        if not verify_password(password, user_row["password_hash"]):
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")

        user_id = current_user.id
        print(f"🗑️ Deleting account for user {user_id} ({current_user.email})")

        # 2. Récupérer les fichiers images à supprimer
        cursor.execute(
            "SELECT image_path, multi_view_images FROM analyses WHERE user_id = %s",
            (user_id,),
        )
        analyses = cursor.fetchall()

        files_to_delete = []
        for analysis in analyses:
            if analysis.get("image_path"):
                path = analysis["image_path"]
                if isinstance(path, str) and not path.startswith("http"):
                    files_to_delete.append(f"uploads/{path}")
            if analysis.get("multi_view_images"):
                try:
                    mvi = (
                        json.loads(analysis["multi_view_images"])
                        if isinstance(analysis["multi_view_images"], str)
                        else analysis["multi_view_images"]
                    )
                    if isinstance(mvi, dict):
                        for _, filename in mvi.items():
                            if filename and isinstance(filename, str) and not filename.startswith("http"):
                                files_to_delete.append(f"uploads/{filename}")
                except (json.JSONDecodeError, TypeError):
                    pass

        # 3. Récupérer les analysis IDs pour supprimer les plans fitness et modèles 3D
        cursor.execute("SELECT id FROM analyses WHERE user_id = %s", (user_id,))
        analysis_ids = [row["id"] for row in cursor.fetchall()]

        # 4. Supprimer les données en cascade (ordre : enfants → parent)
        if analysis_ids:
            placeholders = ",".join(["%s"] * len(analysis_ids))
            cursor.execute(f"DELETE FROM fitness_plans WHERE analysis_id IN ({placeholders})", tuple(analysis_ids))
            cursor.execute(f"DELETE FROM models_3d WHERE analysis_id IN ({placeholders})", tuple(analysis_ids))

        cursor.execute("DELETE FROM user_goals WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM conversation_memory WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM analyses WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))

        db.commit()

        # 5. Supprimer les fichiers du disque
        deleted_files = 0
        for file_path in files_to_delete:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_files += 1
            except Exception as e:
                print(f"⚠️ Could not delete file {file_path}: {e}")

        print(f"✅ Account {user_id} deleted: {len(analysis_ids)} analyses, {deleted_files} files removed")

        return {"message": "Compte supprimé avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting account: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression du compte: {str(e)}")
    finally:
        cursor.close()
        db.close()
