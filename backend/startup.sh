#!/bin/sh
# startup.sh - Railway container startup script
# Creates libGL symlinks from apt into Nix profile so cv2/ultralytics can find them

echo "==> Setting up library symlinks for Nix Python..."
NIX_LIB="/root/.nix-profile/lib"
APT_LIB="/usr/lib/x86_64-linux-gnu"

for lib in libGL.so.1 libGL.so libglib-2.0.so.0 libSM.so.6 libXext.so.6 libXrender.so.1 libgomp.so.1 libmagic.so.1; do
  src=$(find "$APT_LIB" /usr/lib -name "$lib" 2>/dev/null | head -1)
  dst="$NIX_LIB/$lib"
  if [ -n "$src" ] && [ ! -e "$dst" ]; then
    ln -sf "$src" "$dst" 2>/dev/null && echo "  Linked $lib -> $src" || echo "  Failed: $lib"
  fi
done
echo "==> Library symlinks done"

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
