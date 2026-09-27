# DEPLOYMENT GUIDE — RiskForge AI (SIH 26105)

## Architecture

```
User Browser
      ↓
Google Login → Firebase Authentication
      ↓
React Frontend (localhost:5173 / Production)
      ↓ HTTPS + Firebase ID Token
FastAPI Backend (localhost:8000 / Cloud Run)
      ↓ PostgreSQL
Neon PostgreSQL (us-east-2)
```

## Prerequisites

- Google Cloud SDK (`gcloud`) authenticated
- Firebase CLI (`firebase`) authenticated  
- Node.js 18+ and npm
- Python 3.12+
- Neon PostgreSQL account

---

## 1. Firebase Setup

### Create Firebase Project (if not done)
```bash
firebase projects:addfirebase <your-gcp-project-id>
firebase apps:create web "RiskForge Frontend" --project <your-gcp-project-id>
firebase apps:sdkconfig web --project <your-gcp-project-id>
```

### Enable Google Authentication
1. Go to: `https://console.firebase.google.com/project/<project-id>/authentication/providers`
2. Click **Get started**
3. Enable **Google** provider
4. Add authorized domains (your production frontend domain)
5. Save

### Firebase Client Config
The frontend uses these environment variables (safe for browser):
```
VITE_FIREBASE_API_KEY=<from sdkconfig>
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<from sdkconfig>
VITE_FIREBASE_APP_ID=<from sdkconfig>
```

---

## 2. Neon PostgreSQL Setup

1. Create account at https://neon.tech
2. Create a new project (e.g., `riskforge`)
3. Copy the connection string

### Backend Environment Variable
```
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

### Seed Demo Data
```bash
cd backend
python reset_demo.py
```

This creates all tables and seeds the SIH demo data.

---

## 3. Backend Environment Variables

Create `backend/.env`:
```
DATABASE_URL=postgresql+psycopg://...@.../neondb?sslmode=require
SECRET_KEY=<random-32-char-string>
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
FIREBASE_PROJECT_ID=<your-firebase-project-id>
DEFAULT_CURRENCY=INR
DEMO_MODE=true
ENVIRONMENT=development
```

**Never commit `.env` files with real credentials.**

---

## 4. Backend — Local Development

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify: `GET http://localhost:8000/health`

---

## 5. Frontend — Local Development

```bash
cd frontend
npm install
npm run dev
```

Verify: `http://localhost:5173`

---

## 6. Backend — Google Cloud Run Deployment

### Create Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY seed.py reset_demo.py ./
ENV PORT=8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Deploy
```bash
cd backend
gcloud run deploy riskforge-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=<neon-url>,FIREBASE_PROJECT_ID=<project-id>,FRONTEND_URL=<frontend-url>,ENVIRONMENT=production,DEMO_MODE=true"
```

---

## 7. Frontend — Google Cloud Deployment

### Build
```bash
cd frontend
npm run build
```

### Deploy (Firebase Hosting or Cloud Run with Nginx)
```bash
# Option A: Firebase Hosting
firebase init hosting --project <project-id>
firebase deploy --only hosting

# Option B: Cloud Run with nginx
# Create nginx.conf and Dockerfile, then deploy
```

---

## 8. Production CORS Configuration

Update `backend/app/config.py` CORS_ORIGINS to include:
- Your production frontend URL
- Your Cloud Run backend URL

---

## 9. Authentication Flow

```
Google Account → Firebase Auth → Firebase ID Token
                                        ↓
Frontend → POST /api/v1/auth/sync (Bearer token)
                                        ↓
Backend → Verify Firebase token → Upsert user in Neon
                                        ↓
User sees Google name + photo + email in Navbar
```

---

## 10. Troubleshooting

| Issue | Solution |
|---|---|
| `PERMISSION_DENIED` on Firebase | Ensure Google Auth is enabled in Firebase Console |
| `popup_closed_by_user` | User closed Google sign-in popup — try again |
| Neon connection timeout | Check `sslmode=require` in DATABASE_URL |
| CORS error in production | Add frontend URL to CORS_ORIGINS in config.py |
| Firebase token invalid | Check FIREBASE_PROJECT_ID matches frontend config |
| Demo login not working | Ensure seed.py has been run against Neon |

---

## Security Checklist

- [x] `.env` files in `.gitignore`
- [x] No secrets in frontend code
- [x] Firebase client keys are public (by design)
- [x] Firebase Admin uses project-ID-only mode (no service account key needed for token verification)
- [x] No passwords stored for Google-only users
- [x] Firebase ID token verified server-side before trusting identity
- [x] Neon connection uses SSL
