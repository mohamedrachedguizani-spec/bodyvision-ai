#!/usr/bin/env bash
# startup.sh - Telecharge le modele YOLO au demarrage (Railway / ephemeral FS)
set -e

MODEL_DIR="models"
MODEL_FILE="${MODEL_DIR}/best.pt"

mkdir -p "$MODEL_DIR"
mkdir -p "uploads"
mkdir -p "temp_audio"

if [ -n "$MODEL_URL" ] && [ ! -f "$MODEL_FILE" ]; then
  echo "Downloading YOLO model from $MODEL_URL ..."
  curl -fsSL "$MODEL_URL" -o "$MODEL_FILE" --progress-bar
  echo "Model downloaded: $(du -sh $MODEL_FILE | cut -f1)"
elif [ -f "$MODEL_FILE" ]; then
  echo "YOLO model already present: $(du -sh $MODEL_FILE | cut -f1)"
else
  echo "WARNING: MODEL_URL not set - YOLO analysis will be disabled"
fi

echo "Startup script done"