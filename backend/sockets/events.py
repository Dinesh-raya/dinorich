import json
import os

_events_path = os.path.join(os.path.dirname(__file__), '../../shared/events/socket_events.json')
with open(_events_path, 'r', encoding='utf-8') as f:
    SOCKET_EVENTS = json.load(f)

GAME_EVENTS = SOCKET_EVENTS["GAME"]
ROOM_EVENTS = SOCKET_EVENTS["ROOM"]
PROPERTY_EVENTS = SOCKET_EVENTS["PROPERTY"]
AUCTION_EVENTS = SOCKET_EVENTS["AUCTION"]
CONNECTION_EVENTS = SOCKET_EVENTS["CONNECTION"]
TRADE_EVENTS = SOCKET_EVENTS["TRADE"]
QA_EVENTS = SOCKET_EVENTS.get("QA", {})
