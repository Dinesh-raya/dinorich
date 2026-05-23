# DINO-RICHUP — Agent Context

## Project
Indian Monopoly-style multiplayer board game. Backend in Python (FastAPI + python-socketio), frontend in React (Vite + zustand + Tailwind). Runs fully offline on LAN.

## Stack
- Backend: Python 3.11, FastAPI, python-socketio, pydantic, uvicorn
- Frontend: React 18, Vite, socket.io-client, zustand, TailwindCSS, framer-motion
- DB: None (in-memory game state)
- CI: GitHub Actions (pytest backend, tsc + vitest frontend)

## Economy (÷100 Rebalance Applied)
- Starting cash: ₹15,000 | GO reward: ₹1,500 | Jail fine: ₹500
- Property prices: ₹600 (brown) → ₹4,000 (dark blue)
- Income Tax: flat ₹2,400 / 10% | Luxury Tax: flat ₹1,500
- House prices: ₹500 (brown) / ₹600 (light blue) → ₹2,000 (green/dark blue)
- Airport rent: ₹250 × 2^(owned-1) | Utility rent: die × ₹40 (1) / die × ₹100 (2)
- See `docs/GAME_DATA_proposed.md` for full reference

## Key Files
- `shared/configs/board_config.json` — all tile prices, rents, mortgages
- `backend/constants/game_rules.py` — game constants (starting cash, jail fine, house prices)
- `backend/engine/cards.py` — treasury + surprise card templates
- `backend/schemas/room.py` — room settings schema (defaults + validation bounds)
- `backend/engine/turn_manager.py` — turn loop, tax payments, jail handling
- `backend/engine/property.py` — rent calculation, buying, building
- `frontend/types/generated/schemas.ts` — auto-generated from pydantic schemas

## Development Rules
1. NEVER commit to main directly. Always use feature branches.
2. Create a stable tag before starting any major work.
3. Run tests after every change: `pytest -q` (backend) and `npm run typecheck && npm run test` (frontend).
4. Regenerate schemas after changing pydantic models: `npm run codegen` (from frontend/).

## Test Commands
- Backend: `cd backend && pytest -q`
- Frontend: `cd frontend && npm run typecheck && npm run test`
- Full CI: `cd frontend && npm run build` (runs codegen + tsc + vite build)

## Branch History
- `feature/economy-rebalance` — ÷100 scale rebalance (active)
- `feature/ui-polish` — CSS, hover effects, ownership borders
- `feature/center-area` — activity feed, turn status panel
