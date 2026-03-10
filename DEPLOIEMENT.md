# BodyVision AI — Guide de déploiement Beta (Android APK + Heroku)

## Architecture de production

```
[Android APK]  ←──── téléchargement direct ─────  testeurs beta
       ↕
[Heroku Eco Dyno]  ←→  FastAPI (Python 3.11)
       ↕
[ClearDB MySQL Ignite]  ←  gratuit via GitHub Student Pack
```

---

## ⚡ Checklist rapide (ordre impératif)

- [ ] **Étape 1** — Pousser le code sur GitHub
- [ ] **Étape 2** — Uploader `best.pt` dans les GitHub Releases
- [ ] **Étape 3** — Créer l'app Heroku + ClearDB
- [ ] **Étape 4** — Configurer les variables d'environnement Heroku
- [ ] **Étape 5** — Déployer le backend
- [ ] **Étape 6** — Initialiser la base de données
- [ ] **Étape 7** — Configurer EAS + mettre à jour `app.json`
- [ ] **Étape 8** — Builder l'APK Android
- [ ] **Étape 9** — Partager l'APK aux testeurs
- [ ] **Étape 10** — Configurer les secrets GitHub Actions (CI/CD auto)

---

## Étape 1 — Pousser le code sur GitHub

> Assurez-vous que votre dépôt GitHub existe. Si non : GitHub → **New repository** → `bodyvision-ai`.

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai

# Vérifier l'état des fichiers modifiés
git status

# Ajouter tous les fichiers de config de déploiement
git add .

# Commit initial de production
git commit -m "feat: production deployment config — Heroku + EAS APK"

# Pousser sur GitHub
git push origin main
```

> ⚠️ Si le remote n'est pas encore configuré :
> ```powershell
> git remote add origin https://github.com/VOTRE_USER/bodyvision-ai.git
> git branch -M main
> git push -u origin main
> ```

---

## Étape 2 — Héberger le modèle YOLO sur GitHub Releases

> **Pourquoi ?** `best.pt` (83.6 MB) est exclu du `.gitignore`.  
> Heroku a un filesystem éphémère : le modèle doit être téléchargé au démarrage via `startup.sh`.

1. Aller sur `https://github.com/VOTRE_USER/bodyvision-ai`
2. Cliquer sur **Releases** (colonne droite) → **Draft a new release**
3. **Tag** : `v1.0.0` — **Title** : `BodyVision AI Beta v1.0.0`
4. Dans la zone **Attach binaries**, glisser-déposer :
   ```
   C:\Users\USER\Desktop\bodyvision-ai\backend\models\best.pt
   ```
5. Cliquer **Publish release**
6. Sur la page de la release, clic droit sur `best.pt` → **Copier l'adresse du lien**  
   → URL du type : `https://github.com/VOTRE_USER/bodyvision-ai/releases/download/v1.0.0/best.pt`
7. **Garder cette URL** — elle sera utilisée à l'étape 4.

---

## Étape 3 — Créer l'application Heroku + ClearDB

### 3.1 Installer le Heroku CLI

Télécharger depuis : **https://devcenter.heroku.com/articles/heroku-cli**  
Puis ouvrir un nouveau terminal PowerShell et vérifier :

```powershell
heroku --version
# heroku/9.x.x ...
```

### 3.2 Se connecter et créer l'app

```powershell
# Connexion (ouvre le navigateur)
heroku login

# Créer l'app avec un nom unique (ou laisser Heroku en générer un)
heroku create bodyvision-ai-api
# Si le nom est pris → choisir un autre ex: bodyvision-api-beta-2026
```

> 📌 Notez le nom exact de votre app, il sera utilisé partout.

### 3.3 Ajouter les buildpacks

```powershell
# Buildpack 1 : apt (pour libmagic, libGL, etc.)
heroku buildpacks:add --index 1 https://github.com/heroku/heroku-buildpack-apt --app bodyvision-ai-api

# Buildpack 2 : Python
heroku buildpacks:add --index 2 heroku/python --app bodyvision-ai-api

# Vérifier l'ordre
heroku buildpacks --app bodyvision-ai-api
# 1. https://github.com/heroku/heroku-buildpack-apt
# 2. heroku/python
```

### 3.4 Ajouter ClearDB MySQL (gratuit via Student Pack)

```powershell
# Ajouter l'addon ClearDB plan Ignite (5 MB, 10 connexions — gratuit)
heroku addons:create cleardb:ignite --app bodyvision-ai-api

# Vérifier que la variable est bien créée
heroku config --app bodyvision-ai-api | Select-String "CLEARDB"
# CLEARDB_DATABASE_URL: mysql://user:password@host/heroku_xxxxxxxx?reconnect=true
```

> 💡 Cette URL est automatiquement lue par `database.py` — pas besoin de la configurer manuellement.

---

## Étape 4 — Configurer les variables d'environnement Heroku

### 4.1 Générer des clés secrètes sécurisées

```powershell
# Générer SECRET_KEY (64 caractères aléatoires)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# → Copier la valeur affichée

# Générer REFRESH_SECRET_KEY (même commande, nouvelle valeur)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# → Copier la valeur affichée
```

### 4.2 Appliquer toutes les variables en une seule commande

```powershell
heroku config:set `
  SECRET_KEY="COLLEZ_ICI_VOTRE_SECRET_KEY" `
  REFRESH_SECRET_KEY="COLLEZ_ICI_VOTRE_REFRESH_KEY" `
  GROQ_API_KEY="COLLEZ_ICI_VOTRE_CLE_GROQ" `
  ENVIRONMENT="production" `
  MODEL_URL="https://github.com/VOTRE_USER/bodyvision-ai/releases/download/v1.0.0/best.pt" `
  --app bodyvision-ai-api
```

### 4.3 Vérifier toutes les variables

```powershell
heroku config --app bodyvision-ai-api
# Vous devez voir : SECRET_KEY, REFRESH_SECRET_KEY, GROQ_API_KEY,
#                   ENVIRONMENT, MODEL_URL, CLEARDB_DATABASE_URL
```

---

## Étape 5 — Déployer le backend sur Heroku

> Heroku ne supporte que les repos à la racine. Notre backend est dans `/backend`.  
> On utilise `git subtree` pour pousser seulement ce sous-dossier.

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai

# Ajouter le remote Heroku (une seule fois)
heroku git:remote --app bodyvision-ai-api

# Pousser uniquement le dossier /backend vers Heroku
git subtree push --prefix backend heroku main
```

> ⏱️ Premier déploiement : **5–10 minutes** (installation de torch, mediapipe…)

**Suivre les logs en temps réel** :

```powershell
heroku logs --tail --app bodyvision-ai-api
```

Vous devez voir en fin de logs :
```
startup.sh: ⬇️  Téléchargement du modèle YOLO...
startup.sh: ✅ Modèle téléchargé : 84M
🚀 BodyVision AI starting…
✅ MySQL connection pool created (pool_size=5)
✅ Ready to accept connections
```

**En cas d'erreur** de déploiement :
```powershell
# Voir le détail de la compilation
heroku builds:info --app bodyvision-ai-api

# Relancer le dyno
heroku restart --app bodyvision-ai-api
```

---

## Étape 6 — Initialiser la base de données ClearDB

> À faire **une seule fois** après le premier déploiement réussi.

```powershell
# Créer toutes les tables (users, analyses, fitness_plans…)
heroku run "python -c 'from app.database import init_db; init_db()'" --app bodyvision-ai-api
```

Sortie attendue :
```
Running python -c 'from app.database import init_db; init_db()' on bodyvision-ai-api...
✅ MySQL connection pool created (pool_size=5)
✅ Tables créées avec succès
```

**Vérifier que l'API répond** :

```powershell
# Ouvrir la documentation interactive
Start-Process "https://bodyvision-ai-api.herokuapp.com/docs"

# Tester l'endpoint de santé
Invoke-RestMethod -Uri "https://bodyvision-ai-api.herokuapp.com/health"
```

---

## Étape 7 — Configurer EAS pour l'APK Android

### 7.1 Installer EAS CLI

```powershell
npm install -g eas-cli

# Vérifier
eas --version
```

### 7.2 Créer un compte Expo (si pas encore fait)

Aller sur **https://expo.dev** → **Sign Up** → créer un compte gratuit.

### 7.3 Se connecter et initialiser le projet

```powershell
# Se connecter
eas login

# Aller dans le dossier frontend
cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI

# Initialiser EAS (crée le projet sur expo.dev et génère un projectId)
eas init
```

Sortie attendue :
```
✔ Created a project for @VOTRE_USER/bodyvision-ai
✔ Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 7.4 Mettre à jour app.json avec les vraies valeurs

Ouvrir `frontend/BodyVisionAI/app.json` et remplacer :

```json
"extra": {
  "eas": {
    "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
},
"owner": "VOTRE_USERNAME_EXPO"
```

### 7.5 Mettre à jour l'URL API dans eas.json

Ouvrir `frontend/BodyVisionAI/eas.json` et remplacer dans les deux profils `preview` et `production` :

```json
"EXPO_PUBLIC_API_URL": "https://bodyvision-ai-api.herokuapp.com"
```

> Remplacer `bodyvision-ai-api` par le nom exact de votre app Heroku.

### 7.6 Committer les changements

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai
git add frontend/BodyVisionAI/app.json frontend/BodyVisionAI/eas.json
git commit -m "chore: set EAS projectId and Heroku API URL"
git push origin main
```

---

## Étape 8 — Builder l'APK Android

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI

# Installer les dépendances npm si ce n'est pas fait
npm install

# Lancer le build APK (profil preview = APK direct, pas AAB Play Store)
eas build --platform android --profile preview
```

**Ce qui se passe** :
1. EAS envoie le code source sur les serveurs Expo Cloud
2. Compilation native Android (Gradle)
3. Génération d'un APK signé automatiquement
4. Upload sur `expo.dev/builds`

**Suivi du build** :
```powershell
# eas affiche une URL de suivi du type :
# https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds/xxxxxxxx

# Ou surveiller en temps réel dans le terminal avec :
eas build --platform android --profile preview --wait
```

> ⏱️ Durée : **15–25 minutes** (build cloud Expo)

**À la fin** vous recevez :
- Un lien de téléchargement direct du fichier `.apk`
- Un email avec le lien
- Le fichier visible sur `https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds`

---

## Étape 9 — Distribuer l'APK aux testeurs

### Option A — Lien de téléchargement direct (le plus simple)

```powershell
# Voir tous les builds et leurs liens
eas build:list --platform android --limit 5
```

Copier le lien `.apk` et l'envoyer par WhatsApp / email / Telegram aux testeurs.

**Instructions pour les testeurs Android** :
1. Recevoir le lien APK
2. Sur Android : **Paramètres** → **Sécurité** → **Installer des applications inconnues** → activer pour le navigateur
3. Ouvrir le lien → Télécharger l'APK → Installer
4. Ouvrir **BodyVision AI** ✅

### Option B — QR Code via Expo (plus pratique)

```powershell
# Depuis le tableau de bord EAS, chaque build a un QR code
Start-Process "https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds"
# → Partager le QR code de la page du build
```

### Option C — Expo Updates (mises à jour OTA sans rebuild)

Pour les mises à jour mineures (JS uniquement, sans changement natif) :

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI
npm install -g eas-cli

# Publier une mise à jour Over-The-Air
eas update --branch preview --message "Fix: correction du bug X"
# ✅ Les testeurs reçoivent la MAJ automatiquement au prochain lancement
```

---

## Étape 10 — Configurer GitHub Actions (CI/CD automatique)

> À chaque `git push main`, le backend se redéploie sur Heroku et un nouveau APK est buildé.

### 10.1 Récupérer les tokens nécessaires

```powershell
# Token Heroku
heroku auth:token
# → Copier la valeur (ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# Token Expo
eas account:view
# → Aller sur https://expo.dev/settings/access-tokens → Create token
```

### 10.2 Ajouter les secrets dans GitHub

Aller sur `https://github.com/VOTRE_USER/bodyvision-ai/settings/secrets/actions`  
→ **New repository secret** pour chacun :

| Nom du secret | Valeur à coller |
|---|---|
| `HEROKU_API_KEY` | Token obtenu via `heroku auth:token` |
| `HEROKU_APP_NAME` | `bodyvision-ai-api` (nom exact de votre app) |
| `HEROKU_EMAIL` | Votre adresse email Heroku |
| `EXPO_TOKEN` | Token créé sur expo.dev/settings/access-tokens |
| `EXPO_PUBLIC_API_URL` | `https://bodyvision-ai-api.herokuapp.com` |

### 10.3 Vérifier que les workflows fonctionnent

```powershell
# Déclencher manuellement le workflow EAS Build
Start-Process "https://github.com/VOTRE_USER/bodyvision-ai/actions/workflows/eas-build.yml"
# → Cliquer "Run workflow" → platform: android → profile: preview → Run
```

---

## 🔎 Commandes de diagnostic utiles

```powershell
# ── Heroku ───────────────────────────────────────────────────
heroku logs --tail --app bodyvision-ai-api          # logs en temps réel
heroku ps --app bodyvision-ai-api                   # état du dyno
heroku config --app bodyvision-ai-api               # variables d'env
heroku run bash --app bodyvision-ai-api             # console distante
heroku addons --app bodyvision-ai-api               # vérifier ClearDB

# ── EAS / Expo ───────────────────────────────────────────────
eas build:list --platform android --limit 10       # historique des builds
eas update:list --branch preview                   # historique des OTA updates
eas diagnostics                                    # diagnostique local

# ── Test API ──────────────────────────────────────────────────
Invoke-RestMethod "https://bodyvision-ai-api.herokuapp.com/health"
Invoke-RestMethod "https://bodyvision-ai-api.herokuapp.com/docs"
```

---

## 📋 URLs de référence

| Ressource | URL |
|---|---|
| **API (prod)** | `https://bodyvision-ai-api.herokuapp.com` |
| **Swagger Docs** | `https://bodyvision-ai-api.herokuapp.com/docs` |
| **Dashboard Heroku** | `https://dashboard.heroku.com/apps/bodyvision-ai-api` |
| **Builds EAS** | `https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds` |
| **GitHub Actions** | `https://github.com/VOTRE_USER/bodyvision-ai/actions` |
| **GitHub Releases** | `https://github.com/VOTRE_USER/bodyvision-ai/releases` |
