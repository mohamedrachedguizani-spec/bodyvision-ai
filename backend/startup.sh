#!/bin/sh
# startup.sh - Downloads YOLO model at container start (Railway ephemeral FS)
# Uses /bin/sh (not bash) for maximum compatibility

MODEL_DIR="models"
MODEL_FILE="${MODEL_DIR}/best.pt"

mkdir -p "$MODEL_DIR"
mkdir -p "uploads"
mkdir -p "temp_audio"

if [ -n "$MODEL_URL" ]; then
  if [ ! -f "$MODEL_FILE" ]; then
    echo "Downloading YOLO model from $MODEL_URL ..."
    if curl -fsSL "$MODEL_URL" -o "$MODEL_FILE"; then
      echo "Model downloaded: $(du -sh $MODEL_FILE | cut -f1)"
    else
      echo "WARNING: Model download failed (curl error) - YOLO analysis disabled"
    fi
  else
    echo "YOLO model already present: $(du -sh $MODEL_FILE | cut -f1)"
  fi
else
  echo "WARNING: MODEL_URL not set - YOLO analysis disabled"
fi

echo "Startup done - launching server"
