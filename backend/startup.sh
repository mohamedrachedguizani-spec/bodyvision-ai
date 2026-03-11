#!/bin/sh
# startup.sh - Railway container startup script
# Strategie: symlinks dans /root/.nix-profile/lib + patchelf RPATH sur les .so du venv

NIX_LIB="/root/.nix-profile/lib"
APT_LIB="/usr/lib/x86_64-linux-gnu"

echo "==> Setting up library symlinks for Nix Python..."
# Ordre important: deps d'abord (libglib, libGLdispatch, libGLX), puis libGL
for lib in \
  libglib-2.0.so.0 \
  libGLdispatch.so.0 \
  libGLX.so.0 \
  libGL.so.1 libGL.so \
  libgomp.so.1 \
  libSM.so.6 libXext.so.6 libXrender.so.1 \
  libmagic.so.1; do
  src=$(find "$APT_LIB" /usr/lib -name "${lib}*" 2>/dev/null | grep -v '\.py' | head -1)
  dst="$NIX_LIB/$lib"
  if [ -n "$src" ] && [ ! -e "$dst" ]; then
    ln -sf "$src" "$dst" 2>/dev/null && echo "  Linked $lib -> $src" || echo "  Failed: $lib"
  elif [ -z "$src" ]; then
    echo "  MISSING in apt: $lib"
  fi
done
echo "==> Library symlinks done"

# Patcher les .so du venv pour ajouter /root/.nix-profile/lib dans leur RPATH
# (le linker Nix cherche dans ce chemin mais PAS dans /usr/lib/x86_64-linux-gnu)
if command -v patchelf > /dev/null 2>&1; then
  echo "==> Patching venv .so RPATH -> /root/.nix-profile/lib ..."
  find /opt/venv -name '*.so' -type f 2>/dev/null | while read so; do
    patchelf --add-rpath "$NIX_LIB" "$so" 2>/dev/null || true
  done
  echo "==> RPATH patched"
else
  echo "WARNING: patchelf non disponible - RPATH non patche"
fi

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
