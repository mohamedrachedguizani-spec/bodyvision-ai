# BodyVision AI — Backend Production Dockerfile
# Base: python:3.11-slim-bookworm (Debian, PAS Nix)
# -> cv2, mediapipe, ultralytics trouvent libGL sans aucun workaround

FROM python:3.11-slim-bookworm

# Dépendances système pour cv2, mediapipe, ultralytics, python-magic
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances Python (layer cacheable séparé)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p models uploads temp_audio

EXPOSE 8080

CMD ["sh", "startup.sh"]
