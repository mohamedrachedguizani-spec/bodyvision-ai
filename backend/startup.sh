#!/bin/sh
# startup.sh - BodyVision AI startup (Dockerfile/Ubuntu, pas Nix)
# libGL et toutes les deps sont installees dans le Dockerfile -> aucun workaround necessaire

MODEL_DIR="models"
MODEL_FILE="${MODEL_DIR}/best.pt"
mkdir -p "$MODEL_DIR" uploads temp_audio

if [ -n "$MODEL_URL" ]; then
  if [ ! -f "$MODEL_FILE" ]; then
    echo "==> Downloading YOLO model from $MODEL_URL ..."
    if curl -fsSL "$MODEL_URL" -o "$MODEL_FILE"; then
      echo "==> Model downloaded: $(du -sh $MODEL_FILE | cut -f1)"
    else
      echo "WARNING: Model download failed - YOLO analysis disabled"
      rm -f "$MODEL_FILE"
    fi
  else
    echo "==> YOLO model already present: $(du -sh $MODEL_FILE | cut -f1)"
  fi
else
  echo "WARNING: MODEL_URL not set - YOLO analysis disabled"
fi

echo "==> Startup done - launching server"


MODEL_DIR="models"
MODEL_FILE="${MODEL_DIR}/best.pt"
mkdir -p "$MODEL_DIR" uploads temp_audio

if [ -n "$MODEL_URL" ]; then
  if [ ! -f "$MODEL_FILE" ]; then
    echo "==> Downloading YOLO model from $MODEL_URL ..."
    if curl -fsSL "$MODEL_URL" -o "$MODEL_FILE"; then
      echo "==> Model downloaded: $(du -sh $MODEL_FILE | cut -f1)"
    else
      echo "WARNING: Model download failed - YOLO analysis disabled"
      rm -f "$MODEL_FILE"
    fi
  else
    echo "==> YOLO model already present: $(du -sh $MODEL_FILE | cut -f1)"
  fi
else
  echo "WARNING: MODEL_URL not set - YOLO analysis disabled"
fi

echo "==> Startup done - launching server"
