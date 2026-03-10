# ─────────────────────────────────────────────────────────────
# BodyVision AI — Dockerfile de production
# Base : Python 3.10 slim
# Déployé sur Railway via GitHub
# ─────────────────────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# ── Dépendances système ───────────────────────────────────────
# libgl1 + libglib2.0    → OpenCV
# libgomp1               → MediaPipe / YOLO multithreading
# libmagic1              → python-magic (validation uploads)
# wget, curl             → utilitaires
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libmagic1 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Dépendances Python ────────────────────────────────────────
COPY requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

# ── Code applicatif ───────────────────────────────────────────
COPY . .

# ── Répertoires runtime ───────────────────────────────────────
RUN mkdir -p uploads temp_audio tts models

# ── Port ──────────────────────────────────────────────────────
EXPOSE 8000

# Railway injecte $PORT automatiquement.
# --workers 2 = bon équilibre RAM / concurrence pour le plan Hobby Railway
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
