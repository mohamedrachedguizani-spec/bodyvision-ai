"""
BodyVision AI — Point d'entrée de l'application FastAPI.

Ce fichier ne contient que la configuration de l'app, le middleware et
l'enregistrement des routers. Toute la logique métier est dans les
modules routes/, auth.py, ai_services.py, etc.

Optimisé pour supporter 50+ utilisateurs simultanés (bêta).
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import time
import asyncio
from dotenv import load_dotenv

from app.routes import auth_routes, analysis_routes, fitness_routes, profile_routes, coach_routes
from app.database import _get_pool

load_dotenv()


# ──────────────────────────────────────────────────────────────
# Lifecycle : startup / shutdown
# ──────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gère l'initialisation et le nettoyage des ressources."""
    # Startup
    print("🚀 BodyVision AI starting…")
    try:
        _get_pool()  # Initialise le pool de connexions MySQL au démarrage
    except Exception as e:
        print(f"⚠️  DB pool init failed (non-fatal): {e}")
    _cleanup_temp_files()  # Nettoyer les fichiers audio temporaires
    print("✅ Ready to accept connections")
    yield
    # Shutdown
    print("🛑 BodyVision AI shutting down…")


def _cleanup_temp_files():
    """Supprime les fichiers audio temporaires > 1h."""
    temp_dir = "temp_audio"
    if not os.path.exists(temp_dir):
        return
    now = time.time()
    cleaned = 0
    for f in os.listdir(temp_dir):
        fp = os.path.join(temp_dir, f)
        try:
            if os.path.isfile(fp) and now - os.path.getmtime(fp) > 3600:
                os.remove(fp)
                cleaned += 1
        except Exception:
            pass
    if cleaned:
        print(f"🧹 Cleaned {cleaned} temp audio files")


# ──────────────────────────────────────────────────────────────
# Application
# ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="BodyVision AI API",
    version="3.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Type",
        "Accept-Ranges",
        "Content-Range",
        "Content-Length",
        "Content-Disposition",
    ],
)


# ──────────────────────────────────────────────────────────────
# Middleware : rate limiting simple en mémoire (pas de Redis nécessaire)
# Limite : 60 requêtes / minute par IP pour les routes normales,
#          10 / minute pour /coach/* (appels LLM coûteux)
# ──────────────────────────────────────────────────────────────
_rate_limits: dict = {}   # { ip: { "count": int, "reset": float } }
_coach_rate_limits: dict = {}

RATE_LIMIT_GENERAL = 60   # requêtes / minute
RATE_LIMIT_COACH = 10     # requêtes / minute pour le coach LLM


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    path = request.url.path

    # Choisir le bon bucket
    if path.startswith("/coach/"):
        bucket = _coach_rate_limits
        limit = RATE_LIMIT_COACH
    else:
        bucket = _rate_limits
        limit = RATE_LIMIT_GENERAL

    entry = bucket.get(client_ip, {"count": 0, "reset": now + 60})

    # Réinitialiser si la fenêtre est dépassée
    if now > entry["reset"]:
        entry = {"count": 0, "reset": now + 60}

    entry["count"] += 1
    bucket[client_ip] = entry

    if entry["count"] > limit:
        return JSONResponse(
            status_code=429,
            content={"detail": "Trop de requêtes. Veuillez réessayer dans un instant."},
        )

    response = await call_next(request)
    return response


# Nettoyage périodique du rate limiter (éviter fuite mémoire)
async def _cleanup_rate_limits():
    while True:
        await asyncio.sleep(300)  # toutes les 5 min
        now = time.time()
        for bucket in (_rate_limits, _coach_rate_limits):
            expired = [ip for ip, e in bucket.items() if now > e["reset"]]
            for ip in expired:
                del bucket[ip]

@app.on_event("startup")
async def _start_cleanup_task():
    asyncio.create_task(_cleanup_rate_limits())


# Dossier uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ──────────────────────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(analysis_routes.router)
app.include_router(fitness_routes.router)
app.include_router(profile_routes.router)
app.include_router(coach_routes.router)


# ──────────────────────────────────────────────────────────────
# Endpoints utilitaires
# ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    from app.database import get_db
    db_ok = False
    try:
        db = get_db()
        if db:
            db_ok = db.is_connected()
            db.close()
    except Exception:
        pass

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": "BodyVision AI API",
        "version": "3.1.0",
        "features": [
            "Connection pooling (50+ users)",
            "Rate limiting (60 req/min, 10/min coach)",
            "Enhanced multi-view body composition analysis",
            "Advanced posture scoring with intelligent fusion",
            "Intelligent fitness planning",
            "Secure auth with httpOnly refresh tokens",
        ],
    }


@app.get("/")
async def root():
    return {
        "message": "BodyVision AI API is running",
        "version": "3.0.0",
        "endpoints": {
            "/register": "User registration",
            "/login": "User login",
            "/refresh": "Refresh access token",
            "/logout": "Logout (clear refresh cookie)",
            "/analyze-body-comprehensive-enhanced": "Enhanced multi-view body analysis",
            "/generate-intelligent-fitness-plan": "Intelligent fitness plan generation",
            "/user-analyses": "Get user analyses",
            "/analysis/{id}": "Get analysis details",
            "/coach/*": "Virtual coach endpoints",
            "/health": "Health check",
        },
    }


# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
