"""
Script exécuté pendant le build Railway (nixpacks phase.build).
Crée un fichier .pth dans site-packages qui précharge libGL via ctypes
AVANT que cv2 / ultralytics / mediapipe soient importés.

Pourquoi .pth et pas LD_LIBRARY_PATH ?
  LD_LIBRARY_PATH=/usr/lib (glibc) + Python Nix (musl/nixlibc) = crash __vdso_gettimeofday
  ctypes.CDLL(RTLD_GLOBAL) charge uniquement la bibliothèque demandée,
  sans remplacer la libc système.
"""
import site
import os

APT_LIB = "/usr/lib/x86_64-linux-gnu"

# Code exécuté à chaque démarrage Python via le mécanisme .pth
PTH_CODE = (
    "import ctypes, os as _os, glob as _gl; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libglib-2.0.so*'))]; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libGL.so*'))]; "
    "[ctypes.CDLL(l, ctypes.RTLD_GLOBAL) for l in sorted(_gl.glob('/usr/lib/x86_64-linux-gnu/libgomp.so*'))]"
)

site_pkgs = site.getsitepackages()
if not site_pkgs:
    print("WARN: no site-packages found, skipping .pth install")
else:
    pth_path = os.path.join(site_pkgs[0], "libgl_preload.pth")
    with open(pth_path, "w") as f:
        f.write(PTH_CODE + "\n")
    print(f"[install_libgl_pth] Written: {pth_path}")
    print(f"[install_libgl_pth] Content: {PTH_CODE}")
