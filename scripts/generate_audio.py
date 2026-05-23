"""Generate authentic Indian-themed SFX for DINO-RICHUP game.
Produces WAV files in frontend/public/sounds/ using only Python stdlib."""

import struct, math, random, os, wave, io, requests, re
from pathlib import Path

SOUNDS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds"
SAMPLE_RATE = 22050  # Standard for game audio

def write_wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(b"".join(
            struct.pack("<h", max(-32768, min(32767, int(s * 0.7))))
            for s in samples
        ))

def envelope(ln, attack=0.01, release=0.3):
    a = int(ln * attack)
    r = int(ln * release)
    return [min(1.0, i / a) if i < a else max(0.0, 1.0 - (i - (ln - r)) / r) for i in range(ln)]

def sine(freq, dur, vol=0.5):
    n = int(SAMPLE_RATE * dur)
    return [vol * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]

def noise(dur, vol=0.3):
    n = int(SAMPLE_RATE * dur)
    return [vol * random.uniform(-1, 1) for i in range(n)]

def click(freq=800, dur=0.04):
    n = int(SAMPLE_RATE * dur)
    env = envelope(n, 0.001, 0.5)
    return [env[i] * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]

def tabla_tone(freq=180, dur=0.15):
    """Synthetic tabla thump — a brief low-frequency knock."""
    n = int(SAMPLE_RATE * dur)
    env = envelope(n, 0.002, 0.4)
    harmonic = 0.3 * math.sin(2 * math.pi * freq * 2.5 * 0 / SAMPLE_RATE)
    return [env[i] * (math.sin(2 * math.pi * freq * i / SAMPLE_RATE) + 0.3 * math.sin(2 * math.pi * freq * 2.5 * i / SAMPLE_RATE)) for i in range(n)]

def sitar_strum(freq=220, dur=0.5):
    """Synthetic sitar-like pluck with characteristic buzz."""
    n = int(SAMPLE_RATE * dur)
    env = envelope(n, 0.003, 0.7)
    s = []
    for i in range(n):
        t = i / SAMPLE_RATE
        v = env[i] * (
            math.sin(2 * math.pi * freq * t) +
            0.4 * math.sin(2 * math.pi * freq * 2 * t) +
            0.2 * math.sin(2 * math.pi * freq * 3 * t) +
            0.1 * math.sin(2 * math.pi * freq * 4.01 * t)  # Slight detune for buzz
        )
        s.append(v)
    return s

def shehnai_note(freq=440, dur=0.3):
    """Synthetic shehnai-like drone — nasal sustained tone."""
    n = int(SAMPLE_RATE * dur)
    env = envelope(n, 0.05, 0.3)
    return [env[i] * (
        math.sin(2 * math.pi * freq * i / SAMPLE_RATE) * 0.6 +
        math.sin(2 * math.pi * freq * 2 * i / SAMPLE_RATE) * 0.3 +
        math.sin(2 * math.pi * freq * 3 * i / SAMPLE_RATE) * 0.15 +
        noise(0.001, 0.05)[i % int(SAMPLE_RATE * 0.001)] * 0.1
    ) for i in range(n)]

def bell_tone(freq=880, dur=0.5):
    """Temple bell — metallic resonance."""
    n = int(SAMPLE_RATE * dur)
    env = envelope(n, 0.005, 0.8)
    return [env[i] * (
        math.sin(2 * math.pi * freq * i / SAMPLE_RATE) +
        0.5 * math.sin(2 * math.pi * freq * 2.3 * i / SAMPLE_RATE) +
        0.3 * math.sin(2 * math.pi * freq * 4.1 * i / SAMPLE_RATE)
    ) for i in range(n)]

# ---------------------------------------------------------------------------
# Sound generators
# ---------------------------------------------------------------------------

def gen_button_click():
    """Short tabla-knock for UI clicks."""
    yield from tabla_tone(200, 0.06)

def gen_button_hover():
    """Soft sitar pluck for hover."""
    yield from sitar_strum(300, 0.1)[:int(SAMPLE_RATE * 0.08)]

def gen_modal_open():
    """Ascending shehnai flourish."""
    for f in [330, 440, 550]:
        yield from shehnai_note(f, 0.08)

def gen_modal_close():
    """Descending bell chime."""
    for f in [660, 440, 330]:
        yield from bell_tone(f, 0.1)[:int(SAMPLE_RATE * 0.06)]

def gen_dice_roll():
    """Rattling dice — noise envelope."""
    yield from noise(0.6, 0.4)

def gen_dice_land():
    """Single dice landing thud."""
    yield from tabla_tone(150, 0.12)

def gen_dice_double():
    """Two thuds + celebratory chime."""
    yield from tabla_tone(180, 0.1)
    yield from tabla_tone(220, 0.1)
    yield from bell_tone(660, 0.3)

def gen_buy_property():
    """Cash register ka-ching, Indian style."""
    yield from bell_tone(440, 0.1)
    yield from tabla_tone(200, 0.08)
    yield from bell_tone(880, 0.15)

def gen_pay_rent():
    """Money leaving — descending tone."""
    yield from bell_tone(660, 0.08)
    yield from bell_tone(440, 0.08)
    yield from tabla_tone(150, 0.12)

def gen_auction_bid():
    """Rapid tabla roll then impact."""
    for _ in range(4):
        yield from tabla_tone(300, 0.04)
    yield from bell_tone(550, 0.2)

def gen_auction_end():
    """Gavel hit — short sharp impact."""
    yield from tabla_tone(400, 0.03)
    yield from noise(0.05, 0.5)
    yield from bell_tone(330, 0.3)

def gen_player_move():
    """Short footstep clop."""
    yield from tabla_tone(250, 0.08)

def gen_player_jail():
    """Jail door clang — metallic noise."""
    yield from noise(0.15, 0.4)
    yield from bell_tone(200, 0.3)

def gen_player_free():
    """Triumphant shehnai release."""
    for f in [440, 550, 660, 880]:
        yield from shehnai_note(f, 0.1)

def gen_pass_go():
    """Victory chime for passing GO."""
    for f in [523, 659, 784, 1047]:
        yield from bell_tone(f, 0.12)

def gen_build_house():
    """Hammering nail — construction."""
    for _ in range(3):
        yield from tabla_tone(350, 0.06)

def gen_build_hotel():
    """Bigger construction — longer build."""
    for _ in range(5):
        yield from tabla_tone(350, 0.06)
    yield from bell_tone(660, 0.3)

def gen_mortgage():
    """Money borrowed — descending then flat."""
    yield from bell_tone(550, 0.1)
    yield from bell_tone(330, 0.1)
    yield from tabla_tone(180, 0.2)

def gen_unmortgage():
    """Money paid back — ascending."""
    yield from tabla_tone(180, 0.1)
    yield from bell_tone(330, 0.1)
    yield from bell_tone(550, 0.15)

def gen_chance_card():
    """Surprise card — mystery sitar."""
    yield from sitar_strum(200, 0.3)

def gen_community_chest():
    """Treasury card — official shehnai."""
    yield from shehnai_note(440, 0.15)
    yield from shehnai_note(550, 0.15)

def gen_game_start():
    """Grand opening — shehnai + bells."""
    for f in [330, 440, 550, 660]:
        yield from shehnai_note(f, 0.12)
    yield from bell_tone(880, 0.4)

def gen_game_end():
    """Game over fanfare."""
    for f in [440, 440, 550, 660, 880]:
        yield from bell_tone(f, 0.15)

def gen_player_bankrupt():
    """Bankruptcy — sad descending tones."""
    for f in [440, 370, 330, 260]:
        yield from shehnai_note(f, 0.2)

def gen_player_win():
    """Winner — celebratory sitar + bells."""
    for f in [523, 659, 784, 1047]:
        yield from sitar_strum(f, 0.15)
    for f in [1047, 784, 1047]:
        yield from bell_tone(f, 0.2)

# ---------------------------------------------------------------------------
# BGM — download Indian instrumental tracks from Fesliyan Studios (free, royalty-free)
# ---------------------------------------------------------------------------

BGM_SOURCES = {
    "bgm_menu": {
        "url": "https://www.fesliyanstudios.com/musicfiles/bollywood-dreams.mp3",
        "fallback_dur": 30,
    },
    "bgm_game": {
        "url": "https://www.fesliyanstudios.com/musicfiles/mumbai-chase.mp3",
        "fallback_dur": 30,
    },
}

def download_bgm(name, info):
    path = SOUNDS_DIR / f"{name}.wav"
    try:
        # Try direct Fesliyan download URL
        dl_url = f"https://www.fesliyanstudios.com/musicfiles/{name.replace('bgm_', '')}.mp3"
        if name == "bgm_menu":
            dl_url = "https://www.fesliyanstudios.com/musicfiles/bollywood-dreams.mp3"
        elif name == "bgm_game":
            dl_url = "https://www.fesliyanstudios.com/musicfiles/mumbai-chase.mp3"
        
        print(f"  Downloading {dl_url}...")
        r = requests.get(dl_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if r.status_code == 200:
            with open(str(path), "wb") as f:
                f.write(r.content)
            print(f"    OK {name}.mp3 -> {path.name}")
            return
    
    except Exception as e:
        print(f"    ✗ Download failed: {e}")
    
    # Fallback: generate procedural Indian-style drone
    print(f"  Generating fallback {name}...")
    dur = info.get("fallback_dur", 30)
    n = int(SAMPLE_RATE * dur)
    samples = []
    drone_freq = 100 if "menu" in name else 120  # Tanpura-like drone
    for i in range(n):
        t = i / SAMPLE_RATE
        v = (
            math.sin(2 * math.pi * drone_freq * t) * 0.3 +
            math.sin(2 * math.pi * drone_freq * 1.5 * t) * 0.2 +
            math.sin(2 * math.pi * drone_freq * 2.0 * t) * 0.15 +
            0.05 * random.uniform(-1, 1)
        )
        samples.append(v)
    write_wav(path, samples)
    print(f"    OK Generated fallback {path.name}")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

GENERATORS = {
    "button_click": gen_button_click,
    "button_hover": gen_button_hover,
    "modal_open": gen_modal_open,
    "modal_close": gen_modal_close,
    "dice_roll": gen_dice_roll,
    "dice_land": gen_dice_land,
    "dice_double": gen_dice_double,
    "buy_property": gen_buy_property,
    "pay_rent": gen_pay_rent,
    "auction_bid": gen_auction_bid,
    "auction_end": gen_auction_end,
    "player_move": gen_player_move,
    "player_jail": gen_player_jail,
    "player_free": gen_player_free,
    "pass_go": gen_pass_go,
    "build_house": gen_build_house,
    "build_hotel": gen_build_hotel,
    "mortgage": gen_mortgage,
    "unmortgage": gen_unmortgage,
    "chance_card": gen_chance_card,
    "community_chest": gen_community_chest,
    "game_start": gen_game_start,
    "game_end": gen_game_end,
    "player_bankrupt": gen_player_bankrupt,
    "player_win": gen_player_win,
}

def main():
    print("=== DINO-RICHUP Audio Generator ===\n")
    print(f"Output: {SOUNDS_DIR}\n")

    # Generate procedural SFX
    for name, gen_fn in GENERATORS.items():
        path = SOUNDS_DIR / f"{name}.wav"
        print(f"  Generating {name}...")
        samples = list(gen_fn())
        write_wav(path, samples)
        print(f"    OK {path.name} ({len(samples)} samples)")

    print("\n--- BGM Tracks ---")
    for name, info in BGM_SOURCES.items():
        download_bgm(name, info)

    print("\n=== Done ===")

if __name__ == "__main__":
    main()
