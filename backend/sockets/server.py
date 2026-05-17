import socketio
import os
import logging

# Enable socketio logging
log_level = os.getenv("DINO_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))
logger = logging.getLogger('socketio')

# Initialize the Socket.IO server with CORS enabled
raw_origins = os.getenv("DINO_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=cors_origins,
    logger=logger,
    engineio_logger=True,
    ping_timeout=120,
    ping_interval=30,
    connect_timeout=45,
    transports=['websocket', 'polling'],
    allow_upgrades=True
)
