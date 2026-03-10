# ──────────────────────────────────────────────────────────────
# BodyVision AI — Dockerfile (Production)
# Base : python:3.10-slim (compatible mediapipe + opencv + ultralytics)
# ──────────────────────────────────────────────────────────────
FROM python:3.10-slim

# ── Métadonnées ───────────────────────────────────────────────
LABEL maintainer="BodyVision AI"
LABEL version="1.0.0-beta"
LABEL description="BodyVision AI FastAPI Backend"

# ── Variables d'environnement ─────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# ── Dépendances système ───────────────────────────────────────
# libgl1          : OpenCV (cv2)
# libglib2.0-0    : MediaPipe
# libmagic1       : python-magic (détection MIME)
# libgomp1        : OpenMP (YOLO/ultralytics)
# libsm6 libxext6 libxrender-dev : OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dépendances Python ────────────────────────────────────────
# On utilise requirements-prod.txt (PyTorch CPU-only) pour réduire
# la taille de l'image de ~3 GB → ~1.2 GB
COPY requirements-prod.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements-prod.txt

# ── Code source ───────────────────────────────────────────────
COPY . .

# ── Dossiers nécessaires à l'exécution ───────────────────────
RUN mkdir -p uploads temp_audio tts models

# ── Script de démarrage ───────────────────────────────────────
# Railway injecte $PORT dynamiquement (défaut 8000)
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --timeout-keep-alive 75"]
