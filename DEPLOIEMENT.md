# BodyVision AI — Guide de déploiement Beta (Android APK + Railway)

## Architecture de production

```
[Android APK]  ←── téléchargement direct ──  testeurs beta
       ↕
[Railway Service]  ←→  FastAPI Python 3.11
       ↕
[Railway MySQL]  ←  gratuit via GitHub Student Pack ($5/mois)
```

> ✅ **Railway** = pas de carte bancaire avec le GitHub Student Pack  
> ✅ Connexion uniquement avec votre compte GitHub  
> ✅ MySQL inclus dans le même projet

---

## ⚡ Checklist (ordre impératif)

- [ ] **Étape 1** — Uploader `best.pt` dans GitHub Releases
- [ ] **Étape 2** — Créer le projet Railway + MySQL
- [ ] **Étape 3** — Configurer les variables d'environnement
- [ ] **Étape 4** — Déployer depuis GitHub
- [ ] **Étape 5** — Initialiser la base de données
- [ ] **Étape 6** — Configurer EAS + projectId
- [ ] **Étape 7** — Builder l'APK Android
- [ ] **Étape 8** — Partager l'APK aux testeurs
- [ ] **Étape 9** — Configurer GitHub Actions (CI/CD auto)

---

## Étape 1 — Uploader le modèle YOLO dans GitHub Releases

> **Pourquoi ?** `best.pt` (83.6 MB) est exclu du `.gitignore`.  
> Railway télécharge le modèle automatiquement au démarrage via `startup.sh`.

1. Aller sur `https://github.com/mohamedrachedguizani-spec/bodyvision-ai`
2. Cliquer sur **Releases** → **Draft a new release**
3. **Choose a tag** → taper `v1.0.0` → **Create new tag**
4. **Release title** : `BodyVision AI Beta v1.0.0`
5. Faire glisser `C:\Users\USER\Desktop\bodyvision-ai\backend\models\best.pt` dans la zone **Attach binaries**
6. Cliquer **Publish release**
7. Sur la page de la release, clic droit sur `best.pt` → **Copier l'adresse du lien**  
   → URL : `https://github.com/mohamedrachedguizani-spec/bodyvision-ai/releases/download/v1.0.0/best.pt`

---

## Étape 2 — Créer le projet Railway + MySQL

### 2.1 Se connecter à Railway (aucune CB requise)

1. Aller sur **https://railway.app**
2. Cliquer **Login** → **Login with GitHub**
3. Autoriser Railway à accéder à votre GitHub

> 💡 Activer le GitHub Student Pack pour Railway si ce n'est pas encore fait :  
> **https://education.github.com/pack** → chercher "Railway" → **Get access**

### 2.2 Créer le projet

1. Cliquer **New Project**
2. Choisir **Deploy from GitHub repo**
3. Sélectionner `mohamedrachedguizani-spec/bodyvision-ai`
4. **Important** : Quand Railway demande le répertoire racine, saisir `backend`
5. Railway détecte automatiquement Python et démarre le build

### 2.3 Ajouter le plugin MySQL

1. Dans le projet Railway, cliquer **+ New**
2. Choisir **Database** → **MySQL**
3. Railway crée une instance MySQL et injecte automatiquement `DATABASE_URL` dans votre service backend

---

## Étape 3 — Configurer les variables d'environnement

### 3.1 Générer les clés secrètes (PowerShell)

```powershell
# Générer SECRET_KEY
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# → Copier la valeur affichée

# Générer REFRESH_SECRET_KEY (relancer la même commande)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
# → Copier la valeur affichée
```

### 3.2 Ajouter les variables dans Railway

1. Cliquer sur le service **bodyvision-ai** dans Railway
2. Onglet **Variables** → **+ New Variable** pour chacune :

| Variable | Valeur |
|---|---|
| `SECRET_KEY` | Clé générée à l'étape 3.1 |
| `REFRESH_SECRET_KEY` | Clé générée à l'étape 3.1 |
| `GROQ_API_KEY` | Votre clé Groq depuis https://console.groq.com |
| `ENVIRONMENT` | `production` |
| `MODEL_URL` | `https://github.com/mohamedrachedguizani-spec/bodyvision-ai/releases/download/v1.0.0/best.pt` |

> ⚠️ `DATABASE_URL` est déjà injecté automatiquement par le plugin MySQL — ne pas l'ajouter manuellement.

### 3.3 Activer un domaine public

1. Service backend → onglet **Settings** → **Networking**
2. Cliquer **Generate Domain**
3. Copier l'URL (ex : `https://bodyvision-ai-production.up.railway.app`)  
   → **Cette URL est votre API publique**

---

## Étape 4 — Déployer depuis GitHub

> Railway se déploie automatiquement à chaque push sur `main`.  
> Le premier déploiement démarre automatiquement dès la création du projet.

### Suivre les logs de déploiement

1. Service backend → onglet **Deployments**
2. Cliquer sur le déploiement en cours → **View Logs**

Vous devez voir en fin de logs :
```
Downloading YOLO model from https://github.com/.../best.pt ...
Model downloaded: 84M
Startup script done
INFO:     Started server process
INFO:     Application startup complete.
```

**En cas d'erreur** : Vérifier les variables d'environnement dans l'onglet **Variables**.

### Vérifier que l'API est en ligne

```powershell
# Remplacer par votre URL Railway
Invoke-RestMethod "https://bodyvision-ai-production.up.railway.app/health"
# Réponse attendue :
# status    : healthy
# database  : connected
# service   : BodyVision AI API
```

Ouvrir la documentation interactive :
```powershell
Start-Process "https://bodyvision-ai-production.up.railway.app/docs"
```

---

## Étape 5 — Initialiser la base de données

### Via la console Railway

1. Service backend → onglet **Deployments** → cliquer sur le déploiement actif
2. Cliquer **Execute Command** (ou via l'onglet **Shell**)
3. Saisir et exécuter :

```bash
python -c "from app.database import init_db; init_db()"
```

Sortie attendue :
```
Railway MySQL détecté → host=containers-us-west-xxx.railway.app
MySQL connection pool created (pool_size=10)
Tables créées avec succès
```

---

## Étape 6 — Configurer EAS pour le build APK

### 6.1 Installer EAS CLI

```powershell
npm install -g eas-cli
eas --version
```

### 6.2 Créer un compte Expo (si pas encore fait)

Aller sur **https://expo.dev** → **Sign Up** (gratuit)

### 6.3 Se connecter et initialiser

```powershell
eas login

cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI
eas init
# Sortie : "Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 6.4 Mettre à jour app.json

Ouvrir `frontend/BodyVisionAI/app.json` et remplacer les deux champs :

```json
"extra": {
  "eas": {
    "projectId": "VOTRE_PROJECT_ID_AFFICHÉ_PAR_EAS_INIT"
  }
},
"owner": "VOTRE_USERNAME_EXPO"
```

### 6.5 Mettre à jour l'URL API dans eas.json

Ouvrir `frontend/BodyVisionAI/eas.json` et remplacer **dans les profils `preview` et `production`** :

```json
"EXPO_PUBLIC_API_URL": "https://bodyvision-ai-production.up.railway.app"
```

> Remplacer `bodyvision-ai-production.up.railway.app` par votre vraie URL Railway.

### 6.6 Committer les changements

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai
git add frontend/BodyVisionAI/app.json frontend/BodyVisionAI/eas.json
git commit -m "chore: set EAS projectId and Railway API URL"
git push second main
```

---

## Étape 7 — Builder l'APK Android

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI

# Installer les dépendances si besoin
npm install

# Lancer le build APK (profil preview = APK direct téléchargeable)
eas build --platform android --profile preview
```

**Suivi du build** :
- EAS affiche un lien de suivi : `https://expo.dev/accounts/.../projects/bodyvision-ai/builds/...`
- Ou attendre la fin directement dans le terminal :

```powershell
eas build --platform android --profile preview --wait
```

**À la fin** vous recevez :
- Un lien `.apk` de téléchargement direct
- Un email de confirmation
- Le fichier dans `https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds`

> ⏱️ Durée : **15–25 minutes** (build cloud Expo)

---

## Étape 8 — Distribuer l'APK aux testeurs

### Voir la liste des builds et liens APK

```powershell
eas build:list --platform android --limit 5
```

### Méthode A — Lien de téléchargement direct

Envoyer le lien `.apk` par WhatsApp / email / Telegram.

**Instructions pour les testeurs** :
1. Ouvrir le lien sur leur téléphone Android
2. Télécharger l'APK
3. Si Android bloque → **Paramètres** → **Sécurité** → **Sources inconnues** → activer pour le navigateur
4. Ouvrir l'APK → **Installer** → Lancer **BodyVision AI**

### Méthode B — QR Code (depuis expo.dev)

```powershell
Start-Process "https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds"
# → Chaque build a un QR code → partager la capture d'écran
```

### Méthode C — Mises à jour OTA (sans rebuild)

Pour les corrections JS sans changement natif :

```powershell
cd C:\Users\USER\Desktop\bodyvision-ai\frontend\BodyVisionAI
eas update --branch preview --message "Fix: correction du bug X"
# ✅ Les testeurs reçoivent la mise à jour au prochain lancement
```

---

## Étape 9 — Configurer GitHub Actions (CI/CD automatique)

> À chaque `git push main`, le backend se redéploie sur Railway et un nouveau APK est buildé.

### 9.1 Récupérer le token Railway

1. Aller sur **https://railway.app/account/tokens**
2. **New Token** → nommer `github-actions` → **Create**
3. Copier le token

Récupérer le nom du service :
1. Dashboard Railway → votre projet → cliquer sur le service backend
2. Copier le nom affiché (ex : `bodyvision-ai` ou `backend`)

### 9.2 Récupérer le token Expo

```powershell
# Aller sur https://expo.dev/settings/access-tokens
Start-Process "https://expo.dev/settings/access-tokens"
# → New Token → nommer "github-actions" → Create → Copier
```

### 9.3 Ajouter les secrets GitHub

Aller sur `https://github.com/mohamedrachedguizani-spec/bodyvision-ai/settings/secrets/actions`  
→ **New repository secret** pour chacun :

| Nom du secret | Valeur |
|---|---|
| `RAILWAY_TOKEN` | Token créé sur railway.app/account/tokens |
| `RAILWAY_SERVICE_NAME` | Nom du service Railway (ex: `backend`) |
| `EXPO_TOKEN` | Token créé sur expo.dev/settings/access-tokens |
| `EXPO_PUBLIC_API_URL` | URL Railway (ex: `https://bodyvision-ai-production.up.railway.app`) |
| `EXPO_USERNAME` | Votre username expo.dev |

### 9.4 Vérifier les workflows

```powershell
# Déclencher manuellement le build APK
Start-Process "https://github.com/mohamedrachedguizani-spec/bodyvision-ai/actions/workflows/eas-build.yml"
# → Run workflow → profile: preview → Run
```

---

## 🔎 Commandes de diagnostic

```powershell
# ── Test API Railway ──────────────────────────────────────────
Invoke-RestMethod "https://VOTRE_URL.up.railway.app/health"

# ── EAS Builds ───────────────────────────────────────────────
eas build:list --platform android --limit 10
eas update:list --branch preview
eas diagnostics

# ── Git ───────────────────────────────────────────────────────
cd C:\Users\USER\Desktop\bodyvision-ai
git log --oneline -5
git push second main
```

---

## 📋 URLs de référence

| Ressource | URL |
|---|---|
| **API (prod)** | `https://VOTRE_APP.up.railway.app` |
| **Swagger Docs** | `https://VOTRE_APP.up.railway.app/docs` |
| **Dashboard Railway** | `https://railway.app/dashboard` |
| **Builds EAS** | `https://expo.dev/accounts/VOTRE_USER/projects/bodyvision-ai/builds` |
| **GitHub Actions** | `https://github.com/mohamedrachedguizani-spec/bodyvision-ai/actions` |
| **GitHub Releases** | `https://github.com/mohamedrachedguizani-spec/bodyvision-ai/releases` |


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
