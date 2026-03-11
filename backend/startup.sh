#!/bin/sh
# startup.sh - BodyVision AI startup
# Le modele est telecharge en ARRIERE-PLAN pour que uvicorn demarre immediatement

MODEL_FILE="models/best.pt"
mkdir -p models uploads temp_audio

if [ -n "$MODEL_URL" ] && [ ! -f "$MODEL_FILE" ]; then
  echo "==> Downloading YOLO model in background..."
  (curl -fsSL "$MODEL_URL" -o "$MODEL_FILE" \
    && echo "==> Model ready: $(du -sh $MODEL_FILE | cut -f1)") \
    || (echo "WARNING: Model download failed" && rm -f "$MODEL_FILE") &
elif [ -f "$MODEL_FILE" ]; then
  echo "==> YOLO model already present: $(du -sh $MODEL_FILE | cut -f1)"
else
  echo "WARNING: MODEL_URL not set - YOLO analysis disabled"
fi

echo "==> Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8080}" --workers 1 --timeout-keep-alive 120
