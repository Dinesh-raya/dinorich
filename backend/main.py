from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import socketio
import asyncio
import contextlib
import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

from sockets.server import sio
# Import sockets to register events
import sockets.connection
import sockets.room_events
import sockets.game_events
import sockets.property_events
import sockets.auction_events
import sockets.trade_events
import sockets.qa_events
from persistence.db import init_db
from persistence.repository import save_snapshot, load_snapshot, purge_invalid_snapshots
from rooms.manager import room_manager
from services.session_manager import session_manager
from engine.turn_manager import turn_manager
from engine.auction import auction_manager
from engine.trade_manager import trade_manager, TradeOffer
from schemas.action import TurnPhase, AuctionState

async def tick_room_turn(room_code: str, tick_count: int,
                         last_emitted_version: dict[str, int], cached_game_dump: dict[str, dict],
                         last_turn_time: dict[str, int]):
    async with room_manager.get_lock(room_code):
        try:
            turn, auto_roll_dice, buy_timeout_property = turn_manager.tick_turn_timer(room_code)
            game = turn_manager.get_game(room_code)
            if not game:
                return

            if turn:
                game_changed = game.state_version != last_emitted_version.get(room_code)
                timer_changed = turn.time_remaining != last_turn_time.get(room_code)
                if game_changed or timer_changed or auto_roll_dice:
                    if game_changed:
                        cached_game_dump[room_code] = game.model_dump()
                        last_emitted_version[room_code] = game.state_version
                    await sio.emit(
                        "game:state_update",
                        {"game": cached_game_dump.get(room_code, game.model_dump()), "turn": turn.model_dump()},
                        room=room_code,
                    )
                    last_turn_time[room_code] = turn.time_remaining
                if auto_roll_dice:
                    await sio.emit("game:dice_result", auto_roll_dice, room=room_code)

            # Auto-start auction if BUY phase timed out
            if buy_timeout_property is not None and turn:
                participants = [pid for pid in game.turn_order
                                if not game.room.players[pid].is_bankrupt]
                auction_manager.start_auction(room_code, buy_timeout_property, participants)
                turn.phase = TurnPhase.AUCTION
                turn.can_roll = False
                turn.can_end_turn = False
                game.bump_version()
                cached_game_dump[room_code] = game.model_dump()
                last_emitted_version[room_code] = game.state_version
                await sio.emit(
                    "auction:start",
                    {"auction": auction_manager.get_auction(room_code).model_dump()},
                    room=room_code,
                )
                await sio.emit(
                    "game:state_update",
                    {"game": cached_game_dump[room_code], "turn": turn.model_dump()},
                    room=room_code,
                )
        except Exception as e:
            logger.error(f"Error ticking game for room {room_code}: {e}", exc_info=True)

async def tick_room_auctions(room_code: str, last_emitted_version: dict[str, int],
                             cached_game_dump: dict[str, dict], last_turn_time: dict[str, int]):
    async with room_manager.get_lock(room_code):
        try:
            auction = auction_manager.tick(room_code)
            if not auction:
                return

            game = turn_manager.get_game(room_code)
            turn = turn_manager.get_turn_state(room_code)

            if auction.time_remaining == 0 and auction.active:
                if game:
                    auction_manager.end_auction(room_code, game)
                    await sio.emit("auction:end", {"message": "Auction ended by timer"}, room=room_code)
                    if turn:
                        turn.phase = TurnPhase.ACTION
                        turn.can_end_turn = True
                        turn.time_remaining = game.room.settings.turn_timer_seconds
                    game.bump_version()
                    cached_game_dump[room_code] = game.model_dump()
                    last_emitted_version[room_code] = game.state_version
                    await sio.emit(
                        "game:state_update",
                        {"game": cached_game_dump[room_code], "turn": turn.model_dump() if turn else None},
                        room=room_code,
                    )
                    save_snapshot(room_manager.rooms, turn_manager.games, turn_manager.turn_states,
                                   auctions=auction_manager.auctions, trade_manager_obj=trade_manager)
            else:
                await sio.emit("auction:state_update", {"auction": auction.model_dump()}, room=room_code)
        except Exception as e:
            logger.error(f"Error ticking auction for room {room_code}: {e}", exc_info=True)

def perform_periodic_maintenance(cached_game_dump: dict[str, dict], last_emitted_version: dict[str, int],
                                 last_turn_time: dict[str, int]):
    try:
        save_snapshot(room_manager.rooms, turn_manager.games, turn_manager.turn_states,
                      auctions=auction_manager.auctions, trade_manager_obj=trade_manager)
        # Clean up stale cache entries for rooms that no longer exist
        stale_keys = set(cached_game_dump) | set(last_emitted_version) | set(last_turn_time)
        stale_keys = [rc for rc in stale_keys if rc not in room_manager.rooms]
        for rc in stale_keys:
            cached_game_dump.pop(rc, None)
            last_emitted_version.pop(rc, None)
            last_turn_time.pop(rc, None)
        # Clean up expired sessions (older than 24h)
        session_manager.cleanup_expired()
        # Clean up expired trades
        trade_manager.cleanup_expired_trades()
    except Exception as e:
        logger.error(f"Error performing periodic maintenance: {e}", exc_info=True)

async def background_save_loop():
    tick_count = 0
    last_emitted_version: dict[str, int] = {}
    cached_game_dump: dict[str, dict] = {}
    last_turn_time: dict[str, int] = {}
    while True:
        try:
            await asyncio.sleep(1)
            tick_count += 1
            rooms = list(turn_manager.games.keys())

            # 1. Tick game state for each room
            for room_code in rooms:
                await tick_room_turn(room_code, tick_count, last_emitted_version,
                                     cached_game_dump, last_turn_time)
                
            # 2. Tick auctions for each room
            for room_code in rooms:
                await tick_room_auctions(room_code, last_emitted_version, cached_game_dump, last_turn_time)
                
            # 3. Periodic maintenance
            if tick_count % 10 == 0:
                perform_periodic_maintenance(cached_game_dump, last_emitted_version, last_turn_time)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Background save loop outer error: {e}", exc_info=True)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    purge_invalid_snapshots()
    loaded_rooms, loaded_games, loaded_turns, loaded_auctions, loaded_trades = load_snapshot()
    loaded_sessions = session_manager.load_from_db()
    
    room_manager.rooms = loaded_rooms
    turn_manager.games = loaded_games
    turn_manager.turn_states = loaded_turns
    
    # Restore player_rooms mapping
    for room_code, room in loaded_rooms.items():
        for pid in room.players:
            room_manager.player_rooms[pid] = room_code
    
    # Restore auction state
    for room_code, auction_data in loaded_auctions.items():
        auction_manager.auctions[room_code] = AuctionState.model_validate(auction_data)
    
    # Restore trade state
    for room_code, trade_data in loaded_trades.items():
        for tid, tdata in trade_data.get("trades", {}).items():
            if tdata["status"] == "pending":
                trade = TradeOffer(
                    trade_id=tdata["trade_id"],
                    from_player_id=tdata["from_player_id"],
                    to_player_id=tdata["to_player_id"],
                    offering_money=tdata["offering_money"],
                    requesting_money=tdata["requesting_money"],
                    offering_properties=tdata.get("offering_properties", []),
                    requesting_properties=tdata.get("requesting_properties", []),
                    offering_get_out_of_jail_cards=tdata.get("offering_get_out_of_jail_cards", 0),
                    requesting_get_out_of_jail_cards=tdata.get("requesting_get_out_of_jail_cards", 0),
                )
                trade.status = tdata["status"]
                trade_manager.active_trades[tid] = trade
        for pid, tids in trade_data.get("player_trades", {}).items():
            trade_manager.player_trades[pid] = [tid for tid in tids if tid in trade_manager.active_trades]
            
    logger.info(f"Loaded {len(loaded_rooms)} rooms, {len(loaded_games)} games, "
                f"{len(loaded_auctions)} auctions, {len(loaded_trades)} trade sets, "
                f"{loaded_sessions} sessions from DB.")
    
    task = asyncio.create_task(background_save_loop())
    
    yield
    
    # Shutdown
    task.cancel()
    save_snapshot(room_manager.rooms, turn_manager.games, turn_manager.turn_states,
                  auctions=auction_manager.auctions, trade_manager_obj=trade_manager)

app = FastAPI(title="DINO-RICHUP: PAN-INDIA EDITION API", lifespan=lifespan)

# Create ASGI application with socketio
# Mount Socket.IO at /socket.io path
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Endpoint for health check
@app.get("/health")
async def health_check():
    health_status = {"status": "ok", "checks": {}}

    # Check database connectivity
    try:
        from persistence.db import get_connection
        conn = get_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        health_status["checks"]["database"] = "ok"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check room manager
    try:
        room_count = len(room_manager.rooms)
        health_status["checks"]["rooms"] = f"ok ({room_count} active)"
    except Exception as e:
        health_status["checks"]["rooms"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # Check turn manager
    try:
        game_count = len(turn_manager.games)
        health_status["checks"]["games"] = f"ok ({game_count} active)"
    except Exception as e:
        health_status["checks"]["games"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status

# Serve frontend statically in production
frontend_dist = os.path.join(os.path.dirname(__file__), '../frontend/dist')
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Skip Socket.IO paths - let socketio.ASGIApp handle them
        logger.debug(f"SERVE_FRONTEND CALLED: full_path='{full_path}'")
        if full_path.startswith("socket.io/"):
            logger.debug(f"SKIPPING SOCKET.IO PATH")
            raise HTTPException(status_code=404, detail="Not found")

        # Fallback to index.html for client-side routing, but keep strict directory containment.
        normalized = os.path.realpath(os.path.join(frontend_dist, full_path))
        root = os.path.realpath(frontend_dist)
        if not normalized.startswith(root):
            raise HTTPException(status_code=400, detail="Invalid asset path")
        if os.path.exists(normalized) and os.path.isfile(normalized):
            logger.debug(f"Serving file: {normalized}")
            return FileResponse(normalized)
        logger.debug(f"Falling back to index.html")
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    async def root_info():
        return {
            "status": "ok",
            "message": "Backend is running. Start frontend dev server at http://localhost:5173 or build frontend for static serving.",
        }

# Note: For running locally with hot reload:
# uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
