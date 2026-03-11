"""
Package d'analyse corporelle BodyVision AI.

Architecture modulaire :
  • constants       — seuils, poids, tables de référence
  • yolo_classifier — classification corporelle par YOLOv8
  • body_composition— calcul de composition corporelle (CUN-BAE, Boer, SMM)
  • posture_engine  — analyse posturale multi-vues (MediaPipe)
  • recommendations — génération de recommandations ciblées
"""

from app.analysis.constants import (
    VIEW_WEIGHTS,
    POSTURE_THRESHOLDS,
    YOLO_CLASSES,
    YOLO_CLASS_CORRECTIONS,
)
try:
    from app.analysis.yolo_classifier import YoloBodyClassifier
except (ImportError, OSError) as e:
    print(f"⚠️  YoloBodyClassifier non disponible : {e}")
    YoloBodyClassifier = None
from app.analysis.body_composition import BodyCompositionAnalyzer
try:
    from app.analysis.posture_engine import PostureAnalysisEngine
except (ImportError, OSError, RuntimeError) as e:
    print(f"⚠️  PostureAnalysisEngine non disponible : {e}")
    PostureAnalysisEngine = None
from app.analysis.recommendations import RecommendationEngine

__all__ = [
    "VIEW_WEIGHTS",
    "POSTURE_THRESHOLDS",
    "YOLO_CLASSES",
    "YOLO_CLASS_CORRECTIONS",
    "YoloBodyClassifier",
    "BodyCompositionAnalyzer",
    "PostureAnalysisEngine",
    "RecommendationEngine",
]
