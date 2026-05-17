# DINO-RICHUP: Pan-India Edition

## Quick Start

### Backend
- `cd backend`
- `pip install -r requirements.txt`
- `uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload`

### Frontend
- `cd frontend`
- `npm install`
- `npm run dev`

### Docker
- `docker compose up --build`

## Environment
Copy `.env.example` to `.env` and set secure values for:
- `DINO_SECRET_KEY`
- `DINO_CORS_ORIGINS`
- `VITE_API_URL`
