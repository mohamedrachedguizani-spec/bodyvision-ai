#!/usr/bin/env bash
# ============================================================
# startup.sh â€” Script de release Heroku (s'exÃ©cute avant web)
# TÃ©lÃ©charge le modÃ¨le YOLO si absent (ephemeral FS Heroku)
# ============================================================
set -e

MODEL_DIR="models"
MODEL_FILE="${MODEL_DIR}/best.pt"

mkdir -p "$MODEL_DIR"
mkdir -p "uploads"
mkdir -p "temp_audio"

if [ -n "$MODEL_URL" ] && [ ! -f "$MODEL_FILE" ]; then
  echo "â¬‡ï¸  TÃ©lÃ©chargement du modÃ¨le YOLO depuis $MODEL_URL ..."
  curl -L "$MODEL_URL" -o "$MODEL_FILE" --progress-bar
  echo "âœ… ModÃ¨le tÃ©lÃ©chargÃ© : $(du -sh $MODEL_FILE | cut -f1)"
elif [ -f "$MODEL_FILE" ]; then
  echo "âœ… ModÃ¨le YOLO dÃ©jÃ  prÃ©sent : $(du -sh $MODEL_FILE | cut -f1)"
else
  echo "âš ï¸  MODEL_URL non dÃ©fini â€” l'analyse YOLO sera dÃ©sactivÃ©e"
fi

echo "ðŸš€ Release script terminÃ©"
