# DINO-RICHUP Roadmap: 7.5 → 9.5/10

Date: 2026-05-27
Current state: 7.5/10 — core gameplay works, 243 BE + 223 FE tests, QA mode built
Target: 9.5/10 — production-ready, fully verified, polished

---

## Phase 1: E2E Verification (7.5 → 8.0)
**Goal:** Prove all 18 game scenarios work end-to-end with deterministic QA controls.

**Why first:** QA mode is built but untested. This is the highest-leverage work — it validates the entire game loop and finds real bugs before polishing.

### 1.1 Execute E2E Scenarios with QA Mode
- Run all 18 scenarios using QA panel controls
- Capture screenshots for each PASS
- Document any failures with reproduction steps
- Files: `docs/superpowers/specs/2026-05-27-e2e-test-plan.md`

### 1.2 Fix E2E Failures
- Fix bugs found during E2E runs
- Re-run failed scenarios until PASS
- Update test report

### 1.3 E2E Regression Suite
- Create automated E2E test script (Playwright or similar)
- Script uses QA socket commands to set up game states
- Runs in CI on every push

**Exit criteria:** All 18 scenarios PASS with screenshots, automated E2E suite runs in CI.

---

## Phase 2: Production Infrastructure (8.0 → 8.5)
**Goal:** Deploy reliably, monitor health, catch errors in production.

### 2.1 Fix check-schemas.js ESM Bug
- Rename `frontend/scripts/check-schemas.js` → `check-schemas.cjs`
- Or rewrite as ESM with `import.meta.url`
- Severity: Low (build works via fallback), but unblocks clean builds

### 2.2 CI/CD Pipeline
- Verify GitHub Actions runs on push (pytest + tsc + vitest + build)
- Add E2E regression suite to CI
- Add branch protection rules (require tests pass before merge)
- Files: `.github/workflows/ci.yml`

### 2.3 Docker Deployment
- Verify `Dockerfile` builds and runs
- Add `docker-compose.yml` for backend + frontend + SQLite volume
- Test on clean machine (friend's laptop or cloud VM)
- Files: `Dockerfile`, `docker-compose.yml`

### 2.4 Health Monitoring
- Add `/health` endpoint with DB connectivity check
- Add structured logging (JSON format, request IDs)
- Optional: Sentry or similar error tracking
- Files: `backend/main.py`, `backend/utils/logger.py`

### 2.5 Environment Configuration
- Document all env vars in `README.md`
- Add `.env.example` with all configurable values
- Validate env on startup with clear error messages

**Exit criteria:** Docker deployment works on clean machine, CI runs on every push, health check returns meaningful status.

---

## Phase 3: Security Hardening (8.5 → 8.8)
**Goal:** No OWASP top 10 vulnerabilities, safe for LAN play with strangers.

### 3.1 Input Validation
- Validate all socket event payloads with Pydantic models
- Sanitize player names (no XSS, max length)
- Validate room codes (format, length)
- Files: `backend/schemas/contracts.py`, all `*_events.py`

### 3.2 Rate Limiting Review
- Verify rate limiter covers all events (not just some)
- Add per-room rate limits (prevent spam)
- Add connection rate limits (prevent DoS)
- Files: `backend/services/rate_limiter.py`

### 3.3 Session Security
- Add session expiry (auto-kick idle players after 30min)
- Prevent session hijacking (bind session to socket ID)
- Add reconnection token rotation
- Files: `backend/rooms/manager.py`, `backend/sockets/connection.py`

### 3.4 CORS & Transport
- Verify CORS is restrictive (only allows frontend origin)
- Force WebSocket transport (disable polling fallback in production)
- Add Content-Security-Policy headers

**Exit criteria:** No known vulnerabilities, rate limiting covers all endpoints, sessions are secure.

---

## Phase 4: Performance & Polish (8.8 → 9.0)
**Goal:** Fast, responsive, delightful to use.

### 4.1 Frontend Code Splitting
- Lazy-load game board component (`React.lazy`)
- Lazy-load QA panel, trade modal, auction modal
- Target: initial bundle < 200KB (currently 520KB)
- Files: `frontend/src/App.tsx`, router config

### 4.2 Backend Performance
- Profile game state serialization (model_dump is slow for large states)
- Add caching for static data (board config, card templates)
- Optimize DB writes (batch persist instead of per-event)
- Files: `backend/engine/turn_manager.py`, `backend/services/persistence.py`

### 4.3 Mobile Polish
- Test on real Android/iOS devices
- Fix any touch target issues (< 44px)
- Verify PWA install flow works
- Test landscape vs portrait
- Files: various frontend components

### 4.4 Sound & Animation Polish
- Verify all 24 sounds play correctly
- Add haptic feedback for dice roll, property buy
- Smooth dice animation (no jank)
- Files: `frontend/utils/soundManager.ts`, `frontend/components/DiceAnim.tsx`

### 4.5 Accessibility (WCAG 2.1 AA)
- Add ARIA labels to all interactive elements
- Add keyboard navigation (Tab, Enter, Escape)
- Add screen reader announcements for game events
- Add high-contrast mode toggle
- Files: all frontend components

**Exit criteria:** Initial bundle < 200KB, works on mobile devices, keyboard navigable, screen reader friendly.

---

## Phase 5: Game Polish (9.0 → 9.3)
**Goal:** Feels like a real product, not a project.

### 5.1 Tutorial / Onboarding
- First-time player walkthrough
- Show dice, explain turns, highlight buy option
- Skip for returning players (localStorage flag)
- Files: `frontend/components/Tutorial.tsx`

### 5.2 Game History & Replay
- Show full game log (scrollable, filterable)
- Optional: replay game from history
- Files: `frontend/components/GameHistory.tsx`, `backend/schemas/game.py`

### 5.3 Player Profiles
- Track wins/losses per player (localStorage or DB)
- Show stats on lobby screen
- Avatar selection
- Files: `frontend/components/PlayerProfile.tsx`, `backend/schemas/player.py`

### 5.4 Rematch Flow
- "Play Again" button on game over screen
- Rematch with same players, same room
- Option to change settings before rematch
- Files: `frontend/components/GameOver.tsx`, `backend/sockets/room_events.py`

### 5.5 Chat Improvements
- Emoji reactions
- Quick messages ("Nice!", "Ouch!", "GG")
- Chat history persistence
- Files: `frontend/components/Chat.tsx`

**Exit criteria:** New players can learn the game, returning players see their stats, game feels polished.

---

## Phase 6: Advanced Features (9.3 → 9.5)
**Goal:** Differentiated features that make this game unique.

### 6.1 Spectator Mode
- Join room as spectator (view-only)
- See all player positions, properties, money
- No ability to interact
- Files: `backend/rooms/manager.py`, `frontend/components/SpectatorView.tsx`

### 6.2 Game Variants
- Speed mode (shorter game, cheaper properties)
- Custom rules (no auctions, free parking jackpot, etc.)
- Configurable via room settings
- Files: `backend/schemas/room.py`, `frontend/components/RoomSettings.tsx`

### 6.3 Tournament Mode
- Multi-game brackets
- Track scores across games
- Auto-advance winners
- Files: `backend/engine/tournament.py`, `frontend/components/Tournament.tsx`

### 6.4 AI Players (Optional)
- Simple AI that makes basic decisions
- Configurable difficulty
- Fill empty seats in 2-player games
- Files: `backend/engine/ai_player.py`

**Exit criteria:** Spectator mode works, game variants are fun, tournament mode is functional.

---

## Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 1. E2E Verification | Critical | Medium | **Do first** |
| 2. Production Infra | High | Medium | **Do second** |
| 3. Security | High | Low | **Do third** |
| 4. Performance | Medium | Medium | **Do fourth** |
| 5. Game Polish | Medium | Medium | **Do fifth** |
| 6. Advanced Features | Low | High | **Optional** |

## Implementation Order

```
Phase 1 (E2E) → Phase 2 (Infra) → Phase 3 (Security) → Phase 4 (Perf) → Phase 5 (Polish) → Phase 6 (Advanced)
     ↓                ↓                  ↓                  ↓                ↓                  ↓
  8.0/10           8.5/10             8.8/10             9.0/10           9.3/10            9.5/10
```

Each phase is independently deployable. Stop at any phase if satisfied.

---

## Files to Create/Modify Per Phase

### Phase 1
- `docs/superpowers/specs/2026-05-27-e2e-test-results.md` (update)
- Bug fixes (unknown until E2E runs)

### Phase 2
- `frontend/scripts/check-schemas.cjs` (rename)
- `.github/workflows/ci.yml` (verify/update)
- `Dockerfile` (verify)
- `docker-compose.yml` (create)
- `backend/main.py` (health endpoint)
- `backend/utils/logger.py` (structured logging)
- `README.md` (env docs)
- `.env.example` (create)

### Phase 3
- `backend/schemas/contracts.py` (validation)
- `backend/services/rate_limiter.py` (expand coverage)
- `backend/rooms/manager.py` (session expiry)
- `backend/sockets/connection.py` (session binding)

### Phase 4
- `frontend/src/App.tsx` (lazy loading)
- `backend/engine/turn_manager.py` (perf)
- `backend/services/persistence.py` (batch writes)
- Various frontend components (accessibility)

### Phase 5
- `frontend/components/Tutorial.tsx` (new)
- `frontend/components/GameHistory.tsx` (new)
- `frontend/components/PlayerProfile.tsx` (new)
- `frontend/components/GameOver.tsx` (modify)
- `frontend/components/Chat.tsx` (modify)

### Phase 6
- `backend/engine/ai_player.py` (new)
- `backend/engine/tournament.py` (new)
- `frontend/components/SpectatorView.tsx` (new)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| E2E reveals fundamental design flaw | Low | High | QA mode allows targeted testing |
| Docker deployment fails on different OS | Medium | Medium | Test on 2+ environments |
| Security audit finds critical vuln | Low | High | Phase 3 before any public deployment |
| Performance issues with 6 players | Medium | Medium | Profile early, optimize hot paths |
| Accessibility retrofit is expensive | Medium | Low | Incremental, start with ARIA labels |

---

## Success Metrics

| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|--------|---------|---------|---------|---------|---------|---------|---------|
| E2E scenarios pass | 6/18 | 18/18 | 18/18 | 18/18 | 18/18 | 18/18 | 18/18 |
| Backend tests | 243 | 260+ | 270+ | 280+ | 280+ | 290+ | 300+ |
| Frontend tests | 223 | 230+ | 240+ | 240+ | 250+ | 260+ | 270+ |
| CI pipeline | None | E2E+tests | Full | Full | Full | Full | Full |
| Docker deploy | Broken | Broken | Working | Working | Working | Working | Working |
| Security score | Unknown | Unknown | Unknown | Hardened | Hardened | Hardened | Hardened |
| Bundle size | 520KB | 520KB | 520KB | 520KB | <200KB | <200KB | <200KB |
| Mobile support | Basic | Basic | Basic | Basic | Polished | Polished | Polished |
| Accessibility | None | None | None | None | ARIA | ARIA+KB | Full |
| Overall score | 7.5 | 8.0 | 8.5 | 8.8 | 9.0 | 9.3 | 9.5 |
