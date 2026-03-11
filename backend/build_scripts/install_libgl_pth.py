"""
Script exécuté pendant le build Railway (nixpacks phase.build).
Installe sitecustomize.py dans /opt/venv/lib/python3.11/site-packages/
qui précharge libGL et ses dépendances via ctypes AVANT tout import.

Ordre de chargement critique :
  1. libglib-2.0     (dép de base)
  2. libGLdispatch   (libglvnd dispatch layer — libglvnd0)
  3. libGLX          (GLX backend — libglx0)
  4. libGL           (API OpenGL principale — libgl1)
  5. libgomp, libSM, libXext, libXrender

Note: patchelf a déjà fixé le RUNPATH des .so au niveau ELF (solution principale).
Ce sitecustomize.py est une protection supplémentaire au niveau Python.
"""
import site
import os
import sys
import glob

APT_LIB = "/usr/lib/x86_64-linux-gnu"

# Ordre de chargement critique : deps d'abord, puis la lib principale
LIBS_ORDERED = [
    "libglib-2.0.so.0",
    "libGLdispatch.so.0",   # libglvnd0
    "libGLX.so.0",          # libglx0
    "libGL.so.1",           # libgl1
    "libgomp.so.1",
    "libSM.so.6",
    "libXext.so.6",
    "libXrender.so.1",
]

SITECUSTOMIZE_CODE = '''
# sitecustomize.py — précharge libGL + dépendances avant tout import cv2/ultralytics
import ctypes, glob as _gl

_APT = "/usr/lib/x86_64-linux-gnu"
_LIBS = [
    "libglib-2.0.so.0",
    "libGLdispatch.so.0",
    "libGLX.so.0",
    "libGL.so.1",
    "libgomp.so.1",
    "libSM.so.6",
    "libXext.so.6",
    "libXrender.so.1",
]

for _lib in _LIBS:
    for _search in [_APT, "/usr/lib", "/root/.nix-profile/lib"]:
        _matches = sorted(_gl.glob(f"{_search}/{_lib}*"))
        if _matches:
            try:
                ctypes.CDLL(_matches[0], ctypes.RTLD_GLOBAL)
                break
            except OSError:
                continue
'''

# Candidats pour le répertoire site-packages (du venv runtime)
candidates = [
    "/opt/venv/lib/python3.11/site-packages",
    "/opt/venv/lib/python3.12/site-packages",
    "/opt/venv/lib/python3.10/site-packages",
]
try:
    candidates += site.getsitepackages()
except Exception:
    pass

installed = False
for sp in candidates:
    if os.path.isdir(sp):
        sc_path = os.path.join(sp, "sitecustomize.py")
        with open(sc_path, "w") as f:
            f.write(SITECUSTOMIZE_CODE)
        print(f"[install_libgl_pth] sitecustomize.py -> {sc_path}")

        # Diagnostic : vérifier les libs disponibles sur le système
        for lib in LIBS_ORDERED:
            found = glob.glob(f"{APT_LIB}/{lib}*")
            status = f"OK -> {found[0]}" if found else "MISSING!"
            print(f"  {lib}: {status}")

        print(f"[install_libgl_pth] Python: {sys.executable} | Venv: {sys.prefix}")
        installed = True
        break

if not installed:
    print(f"[install_libgl_pth] WARN: aucun site-packages valide trouvé")
    print(f"  Candidats testés: {candidates}")
    print(f"  sys.prefix={sys.prefix}")
else:
    # Vérifier que libGL est bien présent sur le système
    libs = glob.glob(f"{APT_LIB}/libGL.so*")
    print(f"[install_libgl_pth] libGL trouvé: {libs}")
    print(f"[install_libgl_pth] Python: {sys.executable}")
    print(f"[install_libgl_pth] Venv: {sys.prefix}")
