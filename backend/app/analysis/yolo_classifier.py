"""
Classification corporelle par YOLOv8.

Responsabilité unique : charger le modèle YOLO et classifier une image
en type corporel (Musculaire, Moyenne, Surpoids, Maigre, Obèse) et en
genre (Homme, Femme).
"""

import os
from typing import Dict, Any, List

# Import lazy — évite le crash au démarrage si libGL.so.1 est absent
try:
    from ultralytics import YOLO as _YOLO
    YOLO_AVAILABLE = True
except (ImportError, OSError) as _yolo_err:
    print(f"⚠️  YOLO non disponible : {_yolo_err}")
    print("⚠️  L'analyse YOLO sera désactivée.")
    _YOLO = None
    YOLO_AVAILABLE = False

from app.analysis.constants import (
    YOLO_CLASSES,
    YOLO_CLASS_CORRECTIONS,
    GENDER_CLASSES,
    BODY_TYPE_CLASSES,
)


class YoloBodyClassifier:
    """Wrapper autour d'un modèle YOLOv8 entraîné pour la classification corporelle."""

    def __init__(self, model_path: str = "models/best.pt"):
        if not YOLO_AVAILABLE:
            raise RuntimeError("YOLO non disponible (libGL.so.1 manquant ou ultralytics non installé)")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Modèle YOLO introuvable : {model_path}")
        self.model = _YOLO(model_path)
        self.classes = YOLO_CLASSES

    # ─── API publique ─────────────────────────────────────────

    def classify(self, image_path: str) -> Dict[str, Any]:
        """
        Classifie une image et retourne un dictionnaire structuré :
            detected_class, confidence, gender, body_type, primary_class, all_predictions
        """
        results = self.model(image_path)
        predictions = self._extract_predictions(results)

        classification: Dict[str, Any] = {
            "detected_class": "Non détecté",
            "confidence": 0.0,
            "gender": "Non déterminé",
            "body_type": "Non déterminé",
            "primary_class": "Non détecté",
            "all_predictions": predictions,
        }

        # Meilleur résultat par catégorie
        gender_preds = [p for p in predictions if p["is_gender"]]
        body_type_preds = [p for p in predictions if p["is_body_type"]]

        if gender_preds:
            best = gender_preds[0]
            classification["detected_class"] = best["class"]
            classification["confidence"] = best["confidence"]
            classification["gender"] = "male" if best["class"] == "Homme" else "female"

        if body_type_preds:
            best = body_type_preds[0]
            classification["body_type"] = best["class"]
            classification["primary_class"] = best["class"]
        elif gender_preds:
            classification["body_type"] = "Moyenne"
            classification["primary_class"] = "Moyenne"

        # Fallback si rien détecté
        if classification["detected_class"] == "Non détecté":
            classification.update({
                "detected_class": "Homme",
                "gender": "male",
                "body_type": "Moyenne",
                "primary_class": "Moyenne",
                "confidence": 0.5,
            })

        return classification

    # ─── Méthodes internes ────────────────────────────────────

    def _extract_predictions(self, results) -> List[Dict[str, Any]]:
        """Extrait et trie les prédictions du résultat YOLO."""
        predictions: List[Dict[str, Any]] = []

        if not results or len(results) == 0:
            return predictions

        result = results[0]
        if not result.boxes or len(result.boxes) == 0:
            return predictions

        for i in range(len(result.boxes)):
            cls_id = int(result.boxes.cls[i])
            conf = float(result.boxes.conf[i])

            if cls_id >= len(self.classes):
                continue

            class_name = self.classes[cls_id]
            class_name = YOLO_CLASS_CORRECTIONS.get(class_name, class_name)

            predictions.append({
                "class": class_name,
                "confidence": conf,
                "is_gender": class_name in GENDER_CLASSES,
                "is_body_type": class_name in BODY_TYPE_CLASSES,
            })

        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        return predictions
