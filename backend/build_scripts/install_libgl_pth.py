"""
Script exécuté pendant le build Railway (nixpacks phase.build).
Installe libgl_preload.pth dans /opt/venv/lib/python3.11/site-packages/
ET crée sitecustomize.py comme backup.

IMPORTANT : doit être lancé avec /opt/venv/bin/python, PAS avec le python Nix,
sinon les fichiers atterrissent dans les site-packages Nix (non utilisés au runtime).
"""
import site
import os
import sys
import glob

APT_LIB = "/usr/lib/x86_64-linux-gnu"

# Code exécuté à chaque démarrage Python via le mécanisme .pth
PRELOAD_CODE = (
    "import ctypes, glob as _gl; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libglib-2.0.so*'))]; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libGL.so*'))]; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libgomp.so*'))]"
)

SITECUSTOMIZE_CODE = '''
# sitecustomize.py — précharge libGL avant tout import cv2/ultralytics
import ctypes, glob as _gl
for _pat in [
    '/usr/lib/x86_64-linux-gnu/libglib-2.0.so*',
    '/usr/lib/x86_64-linux-gnu/libGL.so*',
    '/usr/lib/x86_64-linux-gnu/libgomp.so*',
]:
    for _lib in sorted(_gl.glob(_pat)):
        try:
            ctypes.CDLL(_lib, ctypes.RTLD_GLOBAL)
        except OSError:
            pass
'''

# Candidats pour le répertoire site-packages
candidates = [
    "/opt/venv/lib/python3.11/site-packages",  # Railway venv (cible principale)
    "/opt/venv/lib/python3.12/site-packages",
    "/opt/venv/lib/python3.10/site-packages",
]
# Ajouter les site-packages détectés dynamiquement
try:
    candidates += site.getsitepackages()
except Exception:
    pass

installed = False
for sp in candidates:
    if os.path.isdir(sp):
        # Installer le .pth
        pth_path = os.path.join(sp, "libgl_preload.pth")
        with open(pth_path, "w") as f:
            f.write(PRELOAD_CODE + "\n")
        print(f"[install_libgl_pth] .pth -> {pth_path}")

        # Installer sitecustomize.py
        sc_path = os.path.join(sp, "sitecustomize.py")
        with open(sc_path, "w") as f:
            f.write(SITECUSTOMIZE_CODE)
        print(f"[install_libgl_pth] sitecustomize.py -> {sc_path}")
        installed = True
        break  # Premier répertoire valide suffit

if not installed:
    print(f"[install_libgl_pth] WARN: aucun site-packages trouvé parmi {candidates}")
    print(f"[install_libgl_pth] sys.prefix={sys.prefix}, sys.path={sys.path}")
else:
    # Vérifier que libGL est bien présent sur le système
    libs = glob.glob(f"{APT_LIB}/libGL.so*")
    print(f"[install_libgl_pth] libGL trouvé: {libs}")
    print(f"[install_libgl_pth] Python: {sys.executable}")
    print(f"[install_libgl_pth] Venv: {sys.prefix}")
