import time
import os
import socketio


URL = os.getenv("SMOKE_SERVER_URL", "http://127.0.0.1:8000")


def emit_with_ack(client, event, payload=None, timeout=8):
    payload = payload or {}
    holder = {"done": False, "resp": None}

    def ack(response):
        holder["done"] = True
        holder["resp"] = response

    client.emit(event, payload, callback=ack)
    started = time.time()
    while not holder["done"] and (time.time() - started) < timeout:
        time.sleep(0.05)
    return holder["resp"]


def main():
    a = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
    b = socketio.Client(reconnection=False, logger=False, engineio_logger=False)

    observed = {"game_started": False, "dice_result": None}

    @a.on("game:start")
    def on_game_start(data):
        observed["game_started"] = True

    @a.on("game:dice_result")
    def on_dice_result(data):
        observed["dice_result"] = data

    @a.on("error")
    def on_error(data):
        print("SERVER_ERROR_EVENT:", data)

    @b.on("error")
    def on_error_b(data):
        print("SERVER_ERROR_EVENT_B:", data)

    a.connect(URL, transports=["polling"], auth={"name": "HostA", "sessionToken": ""})
    b.connect(URL, transports=["polling"], auth={"name": "PlayerB", "sessionToken": ""})

    create_resp = emit_with_ack(a, "room:create", {"name": "HostA", "color": "cyan"})
    assert create_resp and create_resp.get("status") == "success", f"room:create failed: {create_resp}"
    room_code = create_resp["room"]["room_id"]

    join_resp = emit_with_ack(
        b,
        "room:join",
        {"room_code": room_code, "name": "PlayerB", "color": "purple"},
    )
    assert join_resp and join_resp.get("status") == "success", f"room:join failed: {join_resp}"

    start_resp = emit_with_ack(a, "game:start", {})
    start_event_used = "game:start"
    if not start_resp:
        start_resp = emit_with_ack(a, "game_start", {})
        start_event_used = "game_start"
    assert start_resp and start_resp.get("status") == "success", f"game:start failed: {start_resp}"

    # Wait for game:start broadcast
    t0 = time.time()
    while not observed["game_started"] and (time.time() - t0) < 6:
        time.sleep(0.05)
    assert observed["game_started"], "Did not receive game:start event"

    roll_resp = emit_with_ack(a, "game:dice_roll", {})
    roll_event_used = "game:dice_roll"
    if not roll_resp:
        roll_resp = emit_with_ack(a, "game_dice_roll", {})
        roll_event_used = "game_dice_roll"
    if not roll_resp or roll_resp.get("status") != "success":
        # If host isn't first in randomized order, try player B
        roll_resp = emit_with_ack(b, "game:dice_roll", {})
        roll_event_used = "game:dice_roll"
    if not roll_resp or roll_resp.get("status") != "success":
        roll_resp = emit_with_ack(b, "game_dice_roll", {})
        roll_event_used = "game_dice_roll"
    assert roll_resp and roll_resp.get("status") == "success", f"game:dice_roll failed for both players: {roll_resp}"

    # Confirm dice broadcast
    t1 = time.time()
    while observed["dice_result"] is None and (time.time() - t1) < 6:
        time.sleep(0.05)
    assert observed["dice_result"] is not None, "Did not receive game:dice_result event"

    print("SMOKE_PASS")
    print(f"ROOM_CODE={room_code}")
    print(f"START_EVENT={start_event_used}")
    print(f"ROLL_EVENT={roll_event_used}")
    print(f"DICE={observed['dice_result']}")

    b.disconnect()
    a.disconnect()


if __name__ == "__main__":
    main()
