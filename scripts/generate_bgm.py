"""Generate Indian raga-style BGM procedurally.
Uses tanpura drone + tabla rhythm + sitar-style melody for authentic feel.
No external dependencies needed."""

import math, random, struct, wave, os
from pathlib import Path

SOUNDS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "sounds"
SR = 22050
DUR = 45  # seconds per BGM track

def write_wav(path, samples):
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(
            struct.pack("<h", max(-32768, min(32767, int(s * 0.7))))
            for s in samples
        ))

def env(ln, a=0.01, r=0.3):
    a_i = int(ln * a)
    r_i = int(ln * r)
    return [min(1.0, i / a_i) if i < a_i else max(0.0, 1.0 - (i - (ln - r_i)) / r_i) for i in range(ln)]

# Indian scale frequencies (just intonation, Sa = 220 Hz or 240 Hz)
# Raga Bhimpalasi (commonly used in Indian classical)
NOTES_BHIMPALASI = {
    "S": 1.0,       # Sa (tonic)
    "r": 16/15,     # Re (komal - flat)
    "G": 9/8,       # Ga (shuddha)
    "M": 4/3,       # Ma (shuddha)
    "P": 3/2,       # Pa (perfect fifth)
    "d": 8/5,       # Dha (komal - flat)
    "N": 9/5,       # Ni (shuddha)
}

SA_FREQ = 220  # Lower octave for drone, men's range

def tanpura_drone(freq=SA_FREQ, dur=DUR):
    """Tanpura: 4-string drone with characteristic jhankar (cyclic plucking)."""
    n = int(SR * dur)
    samples = []
    # Tanpura strings: Sa, Sa, Pa, Sa (at different octaves)
    strings = [
        (freq, 0.4),           # Sa (lower)
        (freq * 2, 0.3),       # Sa (middle)
        (freq * 1.5, 0.35),    # Pa
        (freq * 4, 0.2),       # Sa (higher)
    ]
    cycle_len = int(SR * 0.12)  # ~120ms per pluck
    env_len = int(SR * 1.5)     # Envelope length
    
    for i in range(n):
        t = i / SR
        val = 0
        for str_freq, str_vol in strings:
            # Each string is plucked cyclically
            phase = (i // cycle_len) % 4 == strings.index((str_freq, str_vol)) % 4 if False else False
            # Simpler: just continuous with beating pattern
            beating = 0.5 + 0.5 * math.sin(2 * math.pi * 0.15 * t + str_freq * 0.001)
            val += str_vol * beating * math.sin(2 * math.pi * str_freq * t + hash(str(str_freq)) % 100)
        samples.append(val * 0.15)
    return samples

def tabla_track(bpm=100, dur=DUR):
    """Tabla rhythm: keherwa taal (8-beat cycle)."""
    n = int(SR * dur)
    beat_len = int(SR * 60 / bpm)
    samples = [0.0] * n
    
    # Keherwa: | Dha | Na | Ti | Na | Dha | Ti | Dha | Ti |
    # Syllable: low thump ('Dha'), flat ('Na'), high ('Ti'), open ('Dha')
    sounds = {
        "Dha": {"freq": 180, "harmonics": 3, "vol": 0.8, "dur": 0.08},  # bass thump
        "Na":  {"freq": 400, "harmonics": 2, "vol": 0.5, "dur": 0.06},  # mid flat
        "Ti":  {"freq": 700, "harmonics": 1, "vol": 0.4, "dur": 0.05},  # high
        "Ge":  {"freq": 250, "harmonics": 2, "vol": 0.6, "dur": 0.07},  # open
    }
    
    pattern = ["Dha", "Na", "Ti", "Na", "Dha", "Ti", "Dha", "Ti"]
    pattern2 = ["Dha", "Ge", "Na", "Ti", "Dha", "Ge", "Na", "Ti"]  # variation
    
    beat_samples = int(SR * 60 / bpm)
    half_beat = beat_samples // 2
    
    for cycle in range(int(dur * bpm / 60)):
        which = pattern if (cycle // 4) % 2 == 0 else pattern2
        for j, syl in enumerate(which):
            start = cycle * beat_samples + (j * half_beat if syl in ("Ti", "Ge") else j * beat_samples // 8 * 3)
            if start >= n:
                break
            info = sounds[syl]
            blen = int(SR * info["dur"])
            for k in range(min(blen, n - start)):
                t = k / SR
                v = (1 - k / blen) * math.exp(-k * 8 / blen)
                tone = math.sin(2 * math.pi * info["freq"] * t)
                for h in range(2, info["harmonics"] + 1):
                    tone += 0.5 / h * math.sin(2 * math.pi * info["freq"] * h * t)
                samples[start + k] += v * tone * info["vol"] * 0.06
    return samples

def melody_line(freq=SA_FREQ * 2, dur=DUR):
    """Sitar/shehnai-style melodic phrases over the drone."""
    n = int(SR * dur)
    samples = [0.0] * n
    
    # Raga Bhimpalasi ascending: S r G M P d N S'
    raga_notes = ["S", "r", "G", "M", "P", "d", "N", "S"]
    note_freqs = [SA_FREQ * NOTES_BHIMPALASI[n] for n in raga_notes]
    # Add octave below
    note_freqs = [f / 2 for f in note_freqs] + note_freqs + [f * 2 for f in note_freqs]
    
    beat_len = SR * 60 / 110  # ~110 bpm for melodic phrases
    
    random.seed(42)
    for i in range(0, n, int(beat_len * 2)):  # Every 2 beats
        note = random.choice(note_freqs)
        note_len = int(beat_len * (1 + random.random()))
        glide = random.choice([True, False])
        
        # Meend (glide) to next note if glide
        end_note = random.choice(note_freqs) if glide else note
        
        for j in range(min(note_len, n - i)):
            t = j / SR
            progress = j / note_len
            cur_freq = note + (end_note - note) * progress
            
            # Sitar: sharp attack with buzzing decay
            v = (1 - progress) * math.exp(-j * 5 / note_len)
            
            # Fundamental + harmonics with sitar-like buzz
            tone = math.sin(2 * math.pi * cur_freq * t)
            tone += 0.4 * math.sin(2 * math.pi * cur_freq * 2 * t)
            tone += 0.2 * math.sin(2 * math.pi * cur_freq * 3 * t)
            tone += 0.1 * math.sin(2 * math.pi * (cur_freq * 2 + 0.5) * t)  # buzz
            
            samples[i + j] += v * tone * 0.15
    return samples

def generate_bgm(name, dur=DUR):
    print(f"  Generating {name}...")
    n = int(SR * dur)
    
    # Layers
    drone = tanpura_drone(SA_FREQ, dur)
    tabla = tabla_track(100, dur)
    melody = melody_line(SA_FREQ * 2, dur)
    
    # Mix
    samples = [0.0] * n
    for i in range(n):
        samples[i] = drone[i] + tabla[i] + melody[i]
    
    # Normalize
    peak = max(abs(s) for s in samples) or 1
    scale = min(1.0, 0.7 / peak)
    samples = [s * scale for s in samples]
    
    path = SOUNDS_DIR / f"{name}.wav"
    write_wav(path, samples)
    print(f"    OK {path.name} ({len(samples)} samples)")

def main():
    print("=== Indian Raga BGM Generator ===\n")
    print(f"Output: {SOUNDS_DIR}\n")
    generate_bgm("bgm_menu", 45)
    generate_bgm("bgm_game", 45)
    print("\n=== Done ===")

if __name__ == "__main__":
    main()
