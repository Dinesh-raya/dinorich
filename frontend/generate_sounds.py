"""Generate procedural sound effects for DINO-RICHUP."""
import wave
import struct
import math
import random
import os

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'public', 'sounds')

def write_wav(filename, samples):
    """Write samples to a WAV file."""
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        for s in samples:
            f.writeframes(struct.pack('<h', max(-32768, min(32767, int(s)))))
    print(f"  Generated: {filename}")

def sine_wave(freq, duration, volume=0.5):
    """Generate a sine wave."""
    n = int(SAMPLE_RATE * duration)
    return [volume * 32767 * math.sin(2 * math.pi * freq * i / SAMPLE_RATE) for i in range(n)]

def noise(duration, volume=0.3):
    """Generate white noise."""
    n = int(SAMPLE_RATE * duration)
    return [volume * 32767 * (random.random() * 2 - 1) for _ in range(n)]

def envelope(samples, attack=0.01, decay=0.1, sustain=0.7, release=0.1):
    """Apply ADSR envelope."""
    n = len(samples)
    attack_n = int(attack * SAMPLE_RATE)
    release_n = int(release * SAMPLE_RATE)
    decay_n = int(decay * SAMPLE_RATE)
    result = []
    for i, s in enumerate(samples):
        if i < attack_n:
            env = i / max(1, attack_n)
        elif i < attack_n + decay_n:
            t = (i - attack_n) / max(1, decay_n)
            env = 1.0 - t * (1.0 - sustain)
        elif i > n - release_n:
            t = (n - i) / release_n
            env = sustain * t
        else:
            env = sustain
        result.append(s * env)
    return result

def mix(*sounds):
    """Mix multiple sounds together."""
    max_len = max(len(s) for s in sounds)
    result = [0.0] * max_len
    for sound in sounds:
        for i, s in enumerate(sound):
            result[i] += s
    return result

def pitch_sweep(start_freq, end_freq, duration, volume=0.5):
    """Generate a frequency sweep."""
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / n
        freq = start_freq + (end_freq - start_freq) * t
        phase = 2 * math.pi * freq * i / SAMPLE_RATE
        samples.append(volume * 32767 * math.sin(phase))
    return samples

def click_sound(freq=1000, duration=0.05, volume=0.4):
    """Short click/tap sound."""
    samples = envelope(sine_wave(freq, duration), attack=0.001, decay=0.01, sustain=0.3, release=0.02)
    return [s * volume for s in samples]

def coin_sound(volume=0.5):
    """Coin/cash register sound."""
    s1 = envelope(sine_wave(1200, 0.1, volume), attack=0.001, decay=0.03, sustain=0.5, release=0.05)
    s2 = envelope(sine_wave(1600, 0.1, volume * 0.8), attack=0.02, decay=0.03, sustain=0.4, release=0.05)
    s3 = envelope(sine_wave(2000, 0.15, volume * 0.6), attack=0.04, decay=0.05, sustain=0.3, release=0.08)
    return mix(s1, s2, s3)

def dice_shake(duration=0.8, volume=0.4):
    """Dice shaking sound - rapid noise bursts."""
    samples = []
    n = int(SAMPLE_RATE * duration)
    for i in range(n):
        t = i / SAMPLE_RATE
        # Multiple rapid impacts
        burst_freq = 30 + random.random() * 20
        burst = math.sin(2 * math.pi * burst_freq * i / SAMPLE_RATE)
        # Add noise
        nse = random.random() * 2 - 1
        # Amplitude modulation for rhythm
        rhythm = 0.5 + 0.5 * math.sin(2 * math.pi * 15 * t)
        val = (burst * 0.6 + nse * 0.4) * rhythm
        # Decay over time
        decay = 1.0 - (t / duration) * 0.3
        samples.append(volume * 32767 * val * decay)
    return samples

def dice_land(volume=0.5):
    """Dice landing thud."""
    # Low frequency thud
    thud = envelope(sine_wave(80, 0.15, volume), attack=0.001, decay=0.05, sustain=0.3, release=0.1)
    # Impact noise
    impact = envelope(noise(0.05, volume * 0.6), attack=0.001, decay=0.02, sustain=0.1, release=0.02)
    return mix(thud, impact)

def chime(freq=800, duration=0.4, volume=0.4):
    """Musical chime/bell sound."""
    fundamental = envelope(sine_wave(freq, duration, volume), attack=0.005, decay=0.1, sustain=0.4, release=0.3)
    harmonic2 = envelope(sine_wave(freq * 2, duration, volume * 0.3), attack=0.005, decay=0.08, sustain=0.2, release=0.2)
    harmonic3 = envelope(sine_wave(freq * 3, duration, volume * 0.15), attack=0.005, decay=0.05, sustain=0.1, release=0.15)
    return mix(fundamental, harmonic2, harmonic3)

def winning_chime(volume=0.5):
    """Victory chime - ascending notes."""
    n1 = chime(523, 0.2, volume)  # C5
    n2 = chime(659, 0.2, volume)  # E5
    n3 = chime(784, 0.3, volume)  # G5
    n4 = chime(1047, 0.5, volume) # C6
    gap = [0] * int(SAMPLE_RATE * 0.1)
    return n1 + gap + n2 + gap + n3 + gap + n4

def sad_trombone(volume=0.4):
    """Sad trombone - descending notes."""
    n1 = envelope(sine_wave(400, 0.3, volume), attack=0.01, decay=0.1, sustain=0.6, release=0.1)
    n2 = envelope(sine_wave(380, 0.3, volume * 0.9), attack=0.01, decay=0.1, sustain=0.6, release=0.1)
    n3 = envelope(sine_wave(350, 0.3, volume * 0.8), attack=0.01, decay=0.1, sustain=0.6, release=0.1)
    n4 = envelope(sine_wave(300, 0.6, volume * 0.7), attack=0.01, decay=0.15, sustain=0.5, release=0.4)
    gap = [0] * int(SAMPLE_RATE * 0.05)
    return n1 + gap + n2 + gap + n3 + gap + n4

def door_slam(volume=0.5):
    """Prison door slam."""
    # Heavy impact
    impact = envelope(noise(0.1, volume), attack=0.001, decay=0.03, sustain=0.2, release=0.06)
    # Metallic clang
    clang = envelope(sine_wave(200, 0.2, volume * 0.6), attack=0.001, decay=0.08, sustain=0.1, release=0.1)
    # Rattle
    rattle = envelope(noise(0.3, volume * 0.2), attack=0.1, decay=0.1, sustain=0.1, release=0.1)
    return mix(impact, clang, rattle)

def unlock_sound(volume=0.4):
    """Unlock/jail free sound."""
    # Click
    click = envelope(sine_wave(2000, 0.05, volume * 0.6), attack=0.001, decay=0.01, sustain=0.3, release=0.03)
    # Rising chime
    rise = pitch_sweep(400, 1200, 0.3, volume * 0.5)
    rise = envelope(rise, attack=0.05, decay=0.05, sustain=0.5, release=0.15)
    return mix(click, [0] * int(SAMPLE_RATE * 0.02) + rise)

def construction_sound(duration=0.4, volume=0.4):
    """Building construction sound."""
    samples = []
    n = int(SAMPLE_RATE * duration)
    for i in range(n):
        t = i / SAMPLE_RATE
        # Hammering rhythm
        hammer = math.sin(2 * math.pi * 100 * i / SAMPLE_RATE)
        rhythm = 1.0 if (int(t * 8) % 2 == 0) else 0.3
        # Add noise for texture
        nse = random.random() * 2 - 1
        val = (hammer * 0.5 + nse * 0.3) * rhythm
        samples.append(volume * 32767 * val)
    return envelope(samples, attack=0.01, decay=0.05, sustain=0.8, release=0.1)

def magic_sparkle(volume=0.4):
    """Magic/card reveal sparkle."""
    s1 = envelope(sine_wave(1500, 0.3, volume * 0.3), attack=0.001, decay=0.1, sustain=0.2, release=0.2)
    s2 = envelope(sine_wave(2000, 0.25, volume * 0.25), attack=0.05, decay=0.08, sustain=0.15, release=0.15)
    s3 = envelope(sine_wave(2500, 0.2, volume * 0.2), attack=0.1, decay=0.05, sustain=0.1, release=0.1)
    s4 = envelope(sine_wave(3000, 0.15, volume * 0.15), attack=0.15, decay=0.03, sustain=0.05, release=0.05)
    return mix(s1, s2, s3, s4)

def chest_open(volume=0.4):
    """Treasure chest opening."""
    creak = envelope(sine_wave(150, 0.2, volume * 0.3), attack=0.01, decay=0.05, sustain=0.4, release=0.1)
    sparkle = magic_sparkle(volume * 0.6)
    gap = [0] * int(SAMPLE_RATE * 0.15)
    return creak + gap + sparkle

def game_show_intro(volume=0.5):
    """Game show intro fanfare."""
    n1 = chime(440, 0.15, volume)  # A4
    n2 = chime(554, 0.15, volume)  # C#5
    n3 = chime(659, 0.15, volume)  # E5
    n4 = chime(880, 0.4, volume)   # A5
    gap = [0] * int(SAMPLE_RATE * 0.08)
    return n1 + gap + n2 + gap + n3 + gap + n4

def bgm_loop(duration=30, volume=0.15):
    """Generate a simple background music loop."""
    # Simple chord progression: C - Am - F - G
    chords = [
        [261.63, 329.63, 392.00],  # C major
        [220.00, 261.63, 329.63],  # A minor
        [174.61, 220.00, 261.63],  # F major
        [196.00, 246.94, 293.66],  # G major
    ]
    chord_duration = duration / (len(chords) * 3)  # 3 repeats
    samples = []
    for _ in range(3):  # Repeat 3 times
        for chord in chords:
            chord_samples = [0.0] * int(SAMPLE_RATE * chord_duration)
            for freq in chord:
                wave_samples = sine_wave(freq, chord_duration, volume / len(chord))
                for i in range(len(chord_samples)):
                    if i < len(wave_samples):
                        chord_samples[i] += wave_samples[i]
            # Add subtle rhythm
            for i in range(len(chord_samples)):
                t = i / SAMPLE_RATE
                beat = 0.7 + 0.3 * math.sin(2 * math.pi * 2 * t)  # 2 Hz beat
                chord_samples[i] *= beat
            samples.extend(chord_samples)
    return samples

def auction_bell(volume=0.5):
    """Auction bell ding."""
    return chime(1000, 0.3, volume)

def menu_bgm(duration=30, volume=0.12):
    """Menu background music - gentler."""
    chords = [
        [196.00, 246.94, 293.66],  # G major
        [174.61, 220.00, 261.63],  # F major
        [164.81, 196.00, 246.94],  # E minor
        [196.00, 246.94, 293.66],  # G major
    ]
    chord_duration = duration / (len(chords) * 3)
    samples = []
    for _ in range(3):
        for chord in chords:
            chord_samples = [0.0] * int(SAMPLE_RATE * chord_duration)
            for freq in chord:
                wave_samples = sine_wave(freq, chord_duration, volume / len(chord))
                for i in range(len(chord_samples)):
                    if i < len(wave_samples):
                        chord_samples[i] += wave_samples[i]
            for i in range(len(chord_samples)):
                t = i / SAMPLE_RATE
                beat = 0.8 + 0.2 * math.sin(2 * math.pi * 0.5 * t)
                chord_samples[i] *= beat
            samples.extend(chord_samples)
    return samples

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Generating DINO-RICHUP sound effects...")

    # Dice & Game Actions
    write_wav('dice_roll.wav', dice_shake(0.8, 0.5))
    write_wav('dice_land.wav', dice_land(0.5))
    write_wav('dice_double.wav', winning_chime(0.4))

    # Game Events
    write_wav('buy_property.wav', coin_sound(0.5))
    write_wav('pay_rent.wav', coin_sound(0.4))
    write_wav('auction_bid.wav', auction_bell(0.4))
    write_wav('auction_end.wav', game_show_intro(0.5))

    # Player Actions
    write_wav('player_move.wav', click_sound(800, 0.06, 0.3))
    write_wav('player_jail.wav', door_slam(0.5))
    write_wav('player_free.wav', unlock_sound(0.4))
    write_wav('pass_go.wav', chime(600, 0.3, 0.4))

    # UI Sounds
    write_wav('button_click.wav', click_sound(1000, 0.04, 0.3))
    write_wav('button_hover.wav', click_sound(1500, 0.03, 0.15))
    write_wav('modal_open.wav', click_sound(800, 0.06, 0.3))
    write_wav('modal_close.wav', click_sound(600, 0.05, 0.25))

    # Property Development
    write_wav('build_house.wav', construction_sound(0.4, 0.4))
    write_wav('build_hotel.wav', construction_sound(0.6, 0.5))
    write_wav('mortgage.wav', coin_sound(0.35))
    write_wav('unmortgage.wav', coin_sound(0.4))

    # Card Effects
    write_wav('chance_card.wav', magic_sparkle(0.4))
    write_wav('community_chest.wav', chest_open(0.4))

    # Game State
    write_wav('game_start.wav', game_show_intro(0.5))
    write_wav('game_end.wav', winning_chime(0.5))
    write_wav('player_bankrupt.wav', sad_trombone(0.4))
    write_wav('player_win.wav', winning_chime(0.6))

    # Background Music
    write_wav('bgm_game.wav', bgm_loop(30, 0.12))
    write_wav('bgm_menu.wav', menu_bgm(30, 0.10))

    print(f"\nDone! Generated 24 sound files in {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
