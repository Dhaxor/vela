#!/usr/bin/env python3
"""Vela soundscapes: original procedural ambient beds for the chapter reader.

README
======
Every sound in assets/audio/ is synthesised from numbers by this script. There
are no samples, recordings or third-party loops, so the output is wholly
original and needs no licence. Run it from anywhere:

    python scripts/gen_soundscapes.py

It writes assets/audio/{night,rain-on-glass,hearth,dawn,star-birth}.m4a and
then verifies them (seams, loudness, length) and prints a report. It needs
Python 3.10+, numpy and ffmpeg/ffprobe on PATH. scipy is not used. Output is
deterministic: fixed seeds, bit-exact AAC muxing.

How the loops stay seamless
---------------------------
Each bed is rendered as ONE period of an endlessly repeating signal, N samples
long, with N a multiple of the 1024-sample AAC frame:
- noise is shaped in the frequency domain of an N-point FFT, so it is circular;
- every tone, drone partial and LFO turns a whole number of cycles per loop;
- one-off events (chimes, drops, crackles, chirps) that run past the end wrap
  around to the start;
- reverb is a circular convolution, so tails ringing past the end land at the start.
Sample N-1 therefore flows into sample 0 exactly as any sample flows into the
next. The loop is then rotated to begin in its quietest half second, so the
encoder's file edges sit where there is least to hear. The script checks it
numerically: sample step, level, spectrum, click energy and linear-prediction
error across the seam are ranked against 2000 interior boundaries, for the
float master AND for the decoded AAC (ffmpeg writes an MP4 edit list that
trims the encoder priming, so the decoded file is exactly N samples long, at
lag 0 against the master).

Sustained tones are mono-safe: each partial is centred, with a quieter chorus
pair detuned left and right, so a phone speaker summing the channels hears a
gentle swell, never a cancellation.

The sounds
----------
night       Pink-to-brown noise (-4 dB/oct, 35 Hz-5 kHz) that breathes about 2 dB
            on a 30 s cycle; a warm open-fifth drone on D (D2 A2 D3 A3, soft
            1/h^1.6 harmonics, each voice swelling on its own slow cycle, a
            chorus pair 1/20 Hz either side); six soft pentatonic glass
            chimes in two minutes through a long reverb.
rain        Rain heard through a window: diffuse noise band-limited to
            150 Hz-3.5 kHz with slow gusts and a quieter 2-9 kHz patter; about
            eighteen droplet ticks a second on the glass (damped 2-5.5 kHz
            sinusoids, log-normal loudness, random pan) that thicken with the
            gusts; larger plinks on the pane; a gutter drip (a rising-pitch
            bubble) every few seconds; low room tone; a short room reverb.
hearth      A low brown-noise rumble and a flickering 250 Hz-2.2 kHz flame
            breath that follow a slow intensity curve; clustered crackles
            (sub-millisecond high-passed noise bursts with heavy-tailed
            loudness, rate rising with intensity squared, the loudest rounded
            off by a soft limiter); occasional ember pops (damped 350-900 Hz
            bodies); two faint sap hisses; a small room.
dawn        An airy G add9 pad (G3 D4 A4 B4 D5, soft 1/h^2 harmonics whose
            overtones bloom on their own slow cycles, with a slow chorus);
            faint high morning air; sparse bird phrases made with FM synthesis
            (a fast trill, a warbled whistle and a two-note call: gliding
            carrier pitch, sine modulator for the buzz, distance-dependent
            level and brightness) in an open-air reverb.
star-birth  A one-second bell chime for the Star Birth ceremony (not a loop):
            A5, then E6, then a faint A6, each from bell partials
            (1, 2, 2.76, 4.07, 5.4) with 12 ms raised-cosine attacks and
            partial-dependent decays, an octave-below bloom and a short room.

Loudness: layers are balanced in LEVELS (tuned by measuring each layer's
gated loudness); beds are normalised to -29 LUFS integrated (EBU R128, ffmpeg
ebur128, measured on the ENCODED file) with true peak far below -1 dBTP; the
chime to -20 LUFS. Encoding: AAC-LC 96 kb/s, 44.1 kHz stereo, +faststart.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

SR = 44100
AAC_FRAME = 1024
BITRATE = "96k"
BED_LUFS = -29.0
CHIME_LUFS = -20.0
MAX_TRUE_PEAK = -1.0
LUFS_TOLERANCE = 0.3
CRACKLE_CEILING = 8.0  # x layer RMS
OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "audio"

Stereo = np.ndarray  # shape (2, n), float64
Layers = dict[str, Stereo]  # a sound's named layers, already balanced; the sound is their sum

# Layer RMS in dB relative to each bed's first layer. Event layers are sparse,
# so their RMS sits well below how loud they sound when they happen.
LEVELS = {
    "night": {"drone": -2.0, "chimes": -14.0},
    "rain": {"patter": -11.0, "room": -16.0, "drops": -3.0},
    "hearth": {"breath": -6.0, "crackles": -4.0, "hiss": -34.0},
    "dawn": {"air": -17.0, "birds": -20.0},
}


# ---------------------------------------------------------------------------
# Periodic building blocks. Everything returned here repeats with period N.
# ---------------------------------------------------------------------------


def loop_length(seconds: float) -> int:
    """Samples in a loop of about `seconds`, rounded to whole AAC frames."""
    return int(round(seconds * SR / AAC_FRAME)) * AAC_FRAME


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x))))


def db(gain_db: float | np.ndarray) -> float | np.ndarray:
    return 10.0 ** (np.asarray(gain_db) / 20.0)


def cycles_for(freq_hz: float, n: int) -> int:
    """Nearest whole number of cycles per loop for a tone (detunes by < 1/(2T) Hz)."""
    return max(1, int(round(freq_hz * n / SR)))


def periodic_phase(n: int, cycles: int) -> np.ndarray:
    """2*pi*cycles*i/n computed in integers, so the loop closes exactly."""
    i = np.arange(n, dtype=np.int64)
    return 2.0 * np.pi * ((cycles * i) % n) / n


def periodic_sine(n: int, cycles: int, phase: float = 0.0) -> np.ndarray:
    return np.sin(periodic_phase(n, cycles) + phase)


def colored_noise(rng: np.random.Generator, n: int, tilt_db_oct: float, lo_hz: float, hi_hz: float) -> np.ndarray:
    """Circular noise: white Gaussian shaped in an n-point FFT (tilt about 1 kHz, 2nd-order band edges). RMS 1."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1.0 / SR)
    f[0] = 1.0
    mag = (f / 1000.0) ** (tilt_db_oct / 6.0206)
    mag /= np.sqrt(1.0 + (lo_hz / f) ** 4)
    mag /= np.sqrt(1.0 + (f / hi_hz) ** 4)
    mag[0] = 0.0
    x = np.fft.irfft(spec * mag, n=n)
    return x / rms(x)


def diffuse_noise(rng: np.random.Generator, n: int, tilt_db_oct: float, lo_hz: float, hi_hz: float,
                  coherence: float) -> Stereo:
    """Stereo noise whose channels share `coherence` (0..1) of their power."""
    common = colored_noise(rng, n, tilt_db_oct, lo_hz, hi_hz)
    a, b = np.sqrt(coherence), np.sqrt(1.0 - coherence)
    return np.stack([a * common + b * colored_noise(rng, n, tilt_db_oct, lo_hz, hi_hz),
                     a * common + b * colored_noise(rng, n, tilt_db_oct, lo_hz, hi_hz)])


def smooth_periodic(rng: np.random.Generator, n: int, max_cycles: int) -> np.ndarray:
    """A smooth random curve in [-1, 1] that repeats every loop (harmonics 1..max_cycles, falling as 1/k)."""
    spec = np.zeros(n // 2 + 1, dtype=complex)
    k = np.arange(1, max_cycles + 1)
    spec[1:max_cycles + 1] = (rng.standard_normal(max_cycles) + 1j * rng.standard_normal(max_cycles)) / k
    curve = np.fft.irfft(spec, n=n)
    return curve / np.max(np.abs(curve))


def circular_convolve(x: Stereo, ir: Stereo) -> Stereo:
    """Each channel convolved with its IR channel, wrapping the tail past the end back to the start."""
    n = x.shape[-1]
    padded = np.zeros((2, n))
    padded[:, :ir.shape[-1]] = ir
    return np.fft.irfft(np.fft.rfft(x, axis=-1) * np.fft.rfft(padded, axis=-1), n=n, axis=-1)


def reverb_ir(rng: np.random.Generator, rt60: float, predelay_ms: float, bright_hz: float) -> Stereo:
    """Decorrelated stereo IR: exponentially decaying noise, highs decaying twice as fast. Unit energy."""
    length = int((rt60 * 1.2) * SR)
    t = np.arange(length) / SR
    ir = np.zeros((2, length))
    for ch in range(2):
        noise = rng.standard_normal(length)
        spec = np.fft.rfft(noise)
        f = np.fft.rfftfreq(length, 1.0 / SR)
        low = np.fft.irfft(spec / np.sqrt(1.0 + (f / bright_hz) ** 4), n=length)
        high = noise - low
        ir[ch] = low * db(-60.0 * t / rt60) + 0.5 * high * db(-120.0 * t / rt60)
    ir *= np.minimum(1.0, t / 0.004)  # soft onset, no click
    pre = int(predelay_ms * SR / 1000)
    ir = np.concatenate([np.zeros((2, pre)), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def start_at_quietest(x: Stereo) -> Stereo:
    """Rotate the loop to begin in its quietest half second (still periodic), so the AAC
    encoder's file edges, the one place a codec can differ, fall where there is least to hear."""
    width = SR // 2
    power = np.mean(x ** 2, axis=0)
    running = np.cumsum(np.concatenate([power, power[:width]]))
    window_energy = running[width:] - running[:-width]  # energy of samples i+1 .. i+width
    return np.roll(x, -((int(np.argmin(window_energy)) + width // 2) % x.shape[-1]), axis=1)


def add_wrapped(buf: Stereo, event: Stereo, start: int) -> None:
    """Mix an event into the loop at `start`, wrapping whatever runs past the end to the beginning."""
    n, length = buf.shape[-1], event.shape[-1]
    start %= n
    head = min(length, n - start)
    buf[:, start:start + head] += event[:, :head]
    if head < length:
        buf[:, :length - head] += event[:, head:]


def pan(mono: np.ndarray, position: float) -> Stereo:
    """Constant-power pan, position in [-1, 1]."""
    theta = (position + 1.0) * np.pi / 4.0
    return np.stack([mono * np.cos(theta), mono * np.sin(theta)])


def raised_cosine(t: np.ndarray, seconds: float) -> np.ndarray:
    return 0.5 - 0.5 * np.cos(np.pi * np.clip(t / seconds, 0.0, 1.0))


def soft_limit(x: np.ndarray, ceiling: float) -> np.ndarray:
    """Round off peaks above `ceiling` (tanh), transparent well below it."""
    return ceiling * np.tanh(x / ceiling)


def lowpass_event(x: np.ndarray, cutoff_hz: float) -> np.ndarray:
    """Gentle zero-phase 2nd-order low-pass for a short event."""
    f = np.fft.rfftfreq(x.size, 1.0 / SR)
    return np.fft.irfft(np.fft.rfft(x) / np.sqrt(1.0 + (f / cutoff_hz) ** 4), n=x.size)


def poisson_times(rng: np.random.Generator, n: int, rate_hz: float,
                  density: np.ndarray | None = None) -> np.ndarray:
    """Event onsets over one loop. With `density` (per-sample, 0..1) the process is thinned to follow it."""
    count = rng.poisson(rate_hz * n / SR)
    times = np.sort(rng.integers(0, n, size=count))
    if density is None:
        return times
    return times[rng.random(times.size) < density[times]]


def spaced_times(rng: np.random.Generator, n: int, count: int, min_gap_s: float) -> list[int]:
    """`count` onsets at least min_gap_s apart, measured around the loop circle (so across the seam too)."""
    gap = int(min_gap_s * SR)
    while True:
        times = np.sort(rng.integers(0, n, size=count))
        diffs = np.diff(np.concatenate([times, [times[0] + n]]))
        if np.all(diffs >= gap):
            return [int(t) for t in times]


CHORUS = 0.35  # level of the detuned pair under each centred partial


def voice(n: int, freq_hz: float, amps: list, chorus_cycles: int, rng: np.random.Generator) -> Stereo:
    """A sustained periodic voice. Harmonic h has amplitude amps[h-1] (a number or a per-sample curve).

    Each harmonic is a centred partial plus a quieter chorus pair detuned by
    -/+ chorus_cycles*h whole cycles per loop, left and right. The mono sum
    (a phone speaker) then swells gently and never cancels.
    """
    base = cycles_for(freq_hz, n)
    out = np.zeros((2, n))
    for h, amp in enumerate(amps, start=1):
        centre = periodic_sine(n, base * h, rng.uniform(0, 2 * np.pi))
        spread = chorus_cycles * h
        out[0] += amp * (centre + CHORUS * periodic_sine(n, base * h - spread, rng.uniform(0, 2 * np.pi)))
        out[1] += amp * (centre + CHORUS * periodic_sine(n, base * h + spread, rng.uniform(0, 2 * np.pi)))
    return out


def leveled(layer: Stereo, reference_rms: float, gain_db: float) -> Stereo:
    """Scale a layer so its RMS sits gain_db relative to the bed's reference layer."""
    return layer * (db(gain_db) * reference_rms / rms(layer))


# ---------------------------------------------------------------------------
# Beds
# ---------------------------------------------------------------------------


def bell(freq: float, seconds: float, partials: list[tuple[float, float, float]], attack_s: float,
         detune_hz: float = 0.0) -> Stereo:
    """Bell-like strike: (ratio, amplitude, decay seconds) partials, soft attack, stereo shimmer."""
    t = np.arange(int(seconds * SR)) / SR
    out = np.zeros((2, t.size))
    for ratio, amp, tau in partials:
        env = amp * np.exp(-t / tau)
        out[0] += env * np.sin(2 * np.pi * freq * ratio * t)
        out[1] += env * np.sin(2 * np.pi * (freq * ratio + detune_hz) * t)
    out *= raised_cosine(t, attack_s) * raised_cosine(t[::-1], 0.2 * seconds)  # soft in, and settle to zero
    return out


def night(n: int, rng: np.random.Generator) -> Layers:
    air = diffuse_noise(rng, n, -4.0, 35.0, 5000.0, coherence=0.55)
    breath_db = 1.4 * periodic_sine(n, 4, rng.uniform(0, 2 * np.pi)) + 0.8 * smooth_periodic(rng, n, 10)
    air *= db(breath_db)

    drone = np.zeros((2, n))
    for freq, swell_cycles, level in [(73.42, 1, 1.0), (110.0, 2, 0.8), (146.83, 3, 0.55), (220.0, 2, 0.35)]:
        harmonics = [level / h ** 1.6 / (1.0 + (h * freq / 600.0) ** 2) for h in range(1, 7)]
        swell = 0.62 + 0.38 * periodic_sine(n, swell_cycles, rng.uniform(0, 2 * np.pi))
        drone += voice(n, freq, harmonics, chorus_cycles=6, rng=rng) * swell

    pentatonic = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66]
    chimes = np.zeros((2, n))
    glass = [(1.0, 1.0, 2.6), (2.0, 0.32, 1.5), (3.0, 0.11, 0.9), (4.2, 0.05, 0.5)]
    for start in spaced_times(rng, n, 6, min_gap_s=14.0):
        note = bell(float(rng.choice(pentatonic)), 6.0, glass, attack_s=0.03, detune_hz=0.7)
        add_wrapped(chimes, pan(note.mean(axis=0), rng.uniform(-0.6, 0.6)) * rng.uniform(0.6, 1.0), start)
    chimes = 0.55 * chimes + 0.75 * circular_convolve(chimes, reverb_ir(rng, 3.2, 30, 2500.0))
    base, lv = rms(air), LEVELS["night"]
    return {"air": air, "drone": leveled(drone, base, lv["drone"]), "chimes": leveled(chimes, base, lv["chimes"])}


def droplet(rng: np.random.Generator) -> np.ndarray:
    freq = float(np.exp(rng.uniform(np.log(2000.0), np.log(5500.0))))
    tau = rng.uniform(0.0015, 0.005)
    t = np.arange(int(6 * tau * SR)) / SR
    return np.exp(-t / tau) * np.sin(2 * np.pi * freq * t) * (1.0 - np.exp(-t / 0.0003))


def plink(rng: np.random.Generator) -> np.ndarray:
    freq = rng.uniform(900.0, 2200.0)
    tau = rng.uniform(0.008, 0.02)
    t = np.arange(int(6 * tau * SR)) / SR
    glide = freq * (1.0 - 0.05 * t / t[-1])
    phase = 2 * np.pi * np.cumsum(glide) / SR
    body = np.sin(phase) + 0.35 * np.sin(2.3 * phase) * np.exp(-t / (tau / 2))
    return body * np.exp(-t / tau) * (1.0 - np.exp(-t / 0.0004))


def bubble(rng: np.random.Generator) -> np.ndarray:
    """A drop into water: a sine whose pitch rises as the bubble shrinks (after Minnaert)."""
    f0 = rng.uniform(700.0, 1300.0)
    tau = rng.uniform(0.02, 0.035)
    t = np.arange(int(5 * tau * SR)) / SR
    freq = f0 * (1.0 + 0.6 * (1.0 - np.exp(-t / 0.02)))
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t / tau) * raised_cosine(t, 0.002)


def rain(n: int, rng: np.random.Generator) -> Layers:
    gust = smooth_periodic(rng, n, 16)
    gust_gain = db(2.5 * gust)
    wash = diffuse_noise(rng, n, -2.0, 150.0, 3500.0, coherence=0.35) * gust_gain
    flutter = db(1.5 * smooth_periodic(rng, n, 120))
    patter = diffuse_noise(rng, n, -1.0, 2000.0, 9000.0, coherence=0.2) * gust_gain * flutter
    room = diffuse_noise(rng, n, -6.0, 25.0, 250.0, coherence=0.8)

    drops = np.zeros((2, n))
    density = (gust + 1.0) / 2.0 * 0.8 + 0.2
    for start in poisson_times(rng, n, 18.0 / 0.6, density):
        add_wrapped(drops, pan(droplet(rng) * rng.lognormal(0.0, 0.6), rng.uniform(-0.9, 0.9)), int(start))
    for start in poisson_times(rng, n, 1.2):
        add_wrapped(drops, pan(plink(rng) * 2.2 * rng.lognormal(0.0, 0.4), rng.uniform(-0.8, 0.8)), int(start))
    t = rng.uniform(0, 2.6)
    while t < n / SR:
        if rng.random() > 0.2:
            add_wrapped(drops, pan(bubble(rng) * rng.uniform(0.5, 0.9), 0.45), int(t * SR))
        t += 2.6 + rng.uniform(-0.3, 0.3)
    drops = drops + 0.45 * circular_convolve(drops, reverb_ir(rng, 0.45, 8, 4000.0))

    base, lv = rms(wash), LEVELS["rain"]
    return {"wash": wash, "patter": leveled(patter, base, lv["patter"]), "room": leveled(room, base, lv["room"]),
            "drops": leveled(drops, base, lv["drops"])}


def crackle(rng: np.random.Generator) -> np.ndarray:
    length = int(rng.uniform(0.0003, 0.004) * SR) + 8
    t = np.arange(length) / SR
    burst = rng.standard_normal(length) * np.exp(-t / rng.uniform(0.0002, 0.0012))
    f = np.fft.rfftfreq(length, 1.0 / SR)
    cutoff = rng.uniform(800.0, 4000.0)
    f[0] = 1.0
    return np.fft.irfft(np.fft.rfft(burst) / np.sqrt(1.0 + (cutoff / f) ** 2), n=length)


def ember_pop(rng: np.random.Generator) -> np.ndarray:
    freq = rng.uniform(350.0, 900.0)
    tau = rng.uniform(0.006, 0.015)
    t = np.arange(int(6 * tau * SR)) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / tau) * (1.0 - np.exp(-t / 0.0005))
    click = np.zeros_like(body)
    c = crackle(rng)
    click[:c.size] = c[:body.size]
    return body + 0.8 * click


def hearth(n: int, rng: np.random.Generator) -> Layers:
    intensity = 1.0 + 0.4 * smooth_periodic(rng, n, 30)
    flicker = smooth_periodic(rng, n, 300)
    rumble = diffuse_noise(rng, n, -6.0, 25.0, 180.0, coherence=0.85) * np.sqrt(intensity) * db(1.0 * flicker)
    breath = diffuse_noise(rng, n, -3.0, 250.0, 2200.0, coherence=0.6)
    breath *= intensity * db(3.0 * smooth_periodic(rng, n, 600))

    crackles = np.zeros((2, n))
    density = (intensity / 1.4) ** 2
    for start in poisson_times(rng, n, 9.0, density):
        amp = min(rng.pareto(2.2) + 1.0, 8.0)
        position = rng.uniform(-0.5, 0.5)
        add_wrapped(crackles, pan(crackle(rng) * amp, position), int(start))
        offset = int(start)
        for _ in range(rng.geometric(1 / 3.0) - 1):  # a pop sheds smaller pops
            offset += int(rng.uniform(0.005, 0.06) * SR)
            add_wrapped(crackles, pan(crackle(rng) * amp * rng.uniform(0.15, 0.5), position + rng.uniform(-0.1, 0.1)), offset)
    for start in poisson_times(rng, n, 0.25):
        add_wrapped(crackles, pan(ember_pop(rng) * rng.uniform(2.0, 3.0), rng.uniform(-0.4, 0.4)), int(start))
    # Real crackles span ~40 dB; round off the loudest so the bed can sit at -29 LUFS without clipping.
    crackles = soft_limit(crackles, CRACKLE_CEILING * rms(crackles))
    crackles = crackles + 0.35 * circular_convolve(crackles, reverb_ir(rng, 0.35, 5, 5000.0))

    hiss = np.zeros((2, n))
    for start in spaced_times(rng, n, 2, min_gap_s=30.0):
        seconds = rng.uniform(1.2, 2.5)
        t = np.arange(int(seconds * SR)) / SR
        band = lowpass_event(rng.standard_normal(t.size), 6000.0) - lowpass_event(rng.standard_normal(t.size), 3000.0)
        add_wrapped(hiss, pan(band * np.sin(np.pi * t / seconds) ** 2, rng.uniform(-0.3, 0.3)), start)

    base, lv = rms(rumble), LEVELS["hearth"]
    return {"rumble": rumble, "breath": leveled(breath, base, lv["breath"]),
            "crackles": leveled(crackles, base, lv["crackles"]), "hiss": leveled(hiss, base, lv["hiss"])}


def fm_note(seconds: float, f_start: float, f_end: float, mod_hz: float, index: float, curve: float = 1.0) -> np.ndarray:
    """FM bird note: carrier glides exponentially f_start -> f_end; a sine modulator adds the warble/buzz."""
    t = np.arange(int(seconds * SR)) / SR
    p = t / seconds
    carrier = f_start * (f_end / f_start) ** (p ** curve)
    phase = 2 * np.pi * np.cumsum(carrier) / SR + index * np.sin(2 * np.pi * mod_hz * t)
    return np.sin(phase) * np.sin(np.pi * p) ** 0.8


def phrase(notes: list[tuple[float, np.ndarray]]) -> np.ndarray:
    """Concatenate (gap_before_seconds, note) pairs."""
    parts = []
    for gap, note in notes:
        parts.append(np.zeros(int(gap * SR)))
        parts.append(note)
    return np.concatenate(parts)


def bird_phrase(rng: np.random.Generator) -> np.ndarray:
    kind = rng.integers(0, 3)
    if kind == 0:  # trill: quick falling sweeps
        count = int(rng.integers(8, 15))
        rate = rng.uniform(14.0, 18.0)
        hi = rng.uniform(3900.0, 4500.0)
        notes = [(1.0 / rate - 0.035 if i else 0.0, fm_note(0.035, hi, hi * 0.85, 90.0, 0.8))
                 for i in range(count)]
        body = phrase(notes)
        return body * np.sin(np.pi * np.arange(body.size) / body.size) ** 0.5
    if kind == 1:  # warbled whistle
        notes = []
        for i in range(int(rng.integers(3, 6))):
            a = rng.uniform(2200.0, 3100.0)
            b = a * rng.uniform(0.85, 1.2)
            notes.append((rng.uniform(0.06, 0.12) if i else 0.0,
                          fm_note(rng.uniform(0.12, 0.22), a, b, rng.uniform(25.0, 35.0), rng.uniform(0.3, 0.6))))
        return phrase(notes)
    high = rng.uniform(4600.0, 5100.0)  # two-note call
    return phrase([(0.0, fm_note(0.18, high, high * 0.92, 60.0, 1.2)),
                   (0.05, fm_note(0.26, high * 0.7, high * 0.62, 60.0, 1.2, curve=0.7))])


def dawn(n: int, rng: np.random.Generator) -> Layers:
    pad = np.zeros((2, n))
    for freq, swell_cycles, level in [(196.0, 1, 1.0), (293.66, 2, 0.7), (440.0, 3, 0.45), (493.88, 2, 0.4), (587.33, 1, 0.3)]:
        swell = 0.55 + 0.45 * periodic_sine(n, swell_cycles, rng.uniform(0, 2 * np.pi))
        # Overtones bloom and recede on their own slow cycles; the fundamental stays steady.
        blooms = [1.0] + [0.5 + 0.5 * periodic_sine(n, int(rng.integers(5, 12)), rng.uniform(0, 2 * np.pi)) for _ in range(4)]
        pad += voice(n, freq, [level / h ** 2 * bloom for h, bloom in enumerate(blooms, start=1)], 2, rng) * swell
    air = diffuse_noise(rng, n, -1.0, 1500.0, 9000.0, coherence=0.1) * db(1.5 * smooth_periodic(rng, n, 8))

    birds = np.zeros((2, n))
    for start in spaced_times(rng, n, 11, min_gap_s=4.0):
        distance = rng.uniform(0.0, 1.0)
        call = lowpass_event(bird_phrase(rng), 9000.0 - 5500.0 * distance) * (1.0 - 0.7 * distance)
        add_wrapped(birds, pan(call, rng.uniform(-0.85, 0.85)), start)
    birds = 0.7 * birds + 0.6 * circular_convolve(birds, reverb_ir(rng, 1.4, 25, 3000.0))

    base, lv = rms(pad), LEVELS["dawn"]
    return {"pad": pad, "air": leveled(air, base, lv["air"]), "birds": leveled(birds, base, lv["birds"])}


def star_birth(rng: np.random.Generator) -> Layers:
    n = SR  # exactly one second
    out = np.zeros((2, n))
    partials = [(1.0, 1.0, 0.55), (2.0, 0.28, 0.35), (2.76, 0.12, 0.22), (4.07, 0.05, 0.15), (5.4, 0.03, 0.1)]
    for onset, freq, amp in [(0.0, 880.0, 1.0), (0.11, 1318.51, 0.8), (0.22, 1760.0, 0.35)]:
        note = bell(freq, 1.0 - onset, partials, attack_s=0.012, detune_hz=1.5) * amp
        out[:, int(onset * SR):] += note
    out += bell(440.0, 1.0, [(1.0, 0.25, 0.4), (2.0, 0.06, 0.25)], attack_s=0.06)
    # One-shot, so the room must not wrap: convolve into a doubled buffer and keep the first second.
    out = out + 0.25 * circular_convolve(np.pad(out, ((0, 0), (0, n))), reverb_ir(rng, 0.6, 10, 5000.0))[:, :n]
    return {"chime": out * raised_cosine(np.arange(n)[::-1] / SR, 0.12)}


@dataclass(frozen=True)
class Sound:
    file: str
    seconds: float
    seed: int
    lufs: float
    loop: bool
    render: Callable[[int, np.random.Generator], Layers]


SOUNDS = [
    Sound("night.m4a", 120.0, 101, BED_LUFS, True, night),
    Sound("rain-on-glass.m4a", 120.0, 202, BED_LUFS, True, rain),
    Sound("hearth.m4a", 120.0, 303, BED_LUFS, True, hearth),
    Sound("dawn.m4a", 120.0, 404, BED_LUFS, True, dawn),
    Sound("star-birth.m4a", 1.0, 505, CHIME_LUFS, False, lambda n, rng: star_birth(rng)),
]


# ---------------------------------------------------------------------------
# ffmpeg: loudness, encode, decode
# ---------------------------------------------------------------------------


def run(cmd: list[str], data: bytes | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, input=data, capture_output=True, check=True)


def raw_input_args() -> list[str]:
    return ["-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0"]


def interleave(x: Stereo) -> bytes:
    return np.ascontiguousarray(x.T, dtype="<f4").tobytes()


@dataclass(frozen=True)
class Loudness:
    integrated: float
    true_peak: float
    lra: float


def parse_ebur128(stderr: str) -> Loudness:
    summary = stderr[stderr.rfind("Summary:"):]
    get = lambda pattern: float(re.search(pattern, summary).group(1).replace("inf", "1e9"))
    return Loudness(get(r"I:\s+(-?[\d.]+|-inf) LUFS"), get(r"Peak:\s+(-?[\d.]+|-inf) dBFS"), get(r"LRA:\s+(-?[\d.]+) LU"))


def loudness_of_samples(x: Stereo) -> Loudness:
    proc = run(["ffmpeg", "-hide_banner", "-nostats", *raw_input_args(), "-af", "ebur128=peak=true", "-f", "null", "-"], interleave(x))
    return parse_ebur128(proc.stderr.decode())


def loudness_of_file(path: Path) -> Loudness:
    proc = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"])
    return parse_ebur128(proc.stderr.decode())


def encode(x: Stereo, path: Path) -> None:
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *raw_input_args(),
         "-c:a", "aac", "-b:a", BITRATE, "-movflags", "+faststart", "-map_metadata", "-1",
         "-fflags", "+bitexact", "-flags:a", "+bitexact", str(path)], interleave(x))


def decode(path: Path) -> Stereo:
    proc = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"])
    return np.frombuffer(proc.stdout, dtype="<f4").reshape(-1, 2).T.astype(np.float64)


def probe(path: Path) -> dict:
    proc = run(["ffprobe", "-v", "error", "-show_entries",
                "stream=codec_name,profile,sample_rate,channels,duration_ts,duration,bit_rate:format=duration,size,bit_rate",
                "-of", "json", str(path)])
    return json.loads(proc.stdout)


# ---------------------------------------------------------------------------
# Seam analysis: the wrap from sample N-1 to sample 0, ranked against the interior
# ---------------------------------------------------------------------------


def percentile_of(value: float, population: np.ndarray) -> float:
    return float(100.0 * np.mean(population < value))


SEAM_WINDOW = 2048  # samples on each side of a boundary (46 ms)
LPC_ORDER = 32


def prediction_residual(mono: np.ndarray) -> np.ndarray:
    """Circular linear-prediction error (order LPC_ORDER, fitted on the first 10 s).

    Prediction whitens the bed's own colour, so what is left is the part no
    smooth continuation explains: a discontinuity shows up as a burst here.
    """
    seg = mono[: SR * 10]
    r = np.array([np.dot(seg[: seg.size - k], seg[k:]) for k in range(LPC_ORDER + 1)])
    toeplitz = r[np.abs(np.subtract.outer(np.arange(LPC_ORDER), np.arange(LPC_ORDER)))]
    coeffs = np.linalg.solve(toeplitz + 1e-9 * r[0] * np.eye(LPC_ORDER), r[1:])
    fir = np.zeros(mono.size)
    fir[0] = 1.0
    fir[1:LPC_ORDER + 1] = -coeffs
    return np.fft.irfft(np.fft.rfft(mono) * np.fft.rfft(fir), n=mono.size)


def seam_metrics(x: Stereo, prediction: bool = True, probes: int = 2000) -> dict:
    """How the wrap from sample N-1 to sample 0 ranks among `probes` interior boundaries.

    Each statistic compares the audio just BEFORE a boundary with the audio just
    AFTER it, so slow swells do not count, only discontinuities do:
      step      |x[i] - x[i-1]|, ranked against every sample step in the loop
      level     |log RMS before - log RMS after|
      spectrum  mean |dB spectrum before - dB spectrum after| (50 Hz-16 kHz)
      click     energy of the second difference across the boundary (clicks live there)
      residual  linear-prediction error energy just after the boundary (prediction=True)
    Values are percentile ranks (0-100). A seamless loop ranks like any interior
    point. A cut ranks 100 where the bed is predictable (the night bed: step,
    click and residual all 100); inside broadband noise a cut hides
    statistically, as it largely does to the ear, so those beds rest on their
    circular construction, which the decoded length and lag checks preserve.

    The residual is for the float master only. A decoded loop's two file edges
    are coded independently, and the codec's ~16 kHz low-pass leaves the
    interior almost perfectly predictable up there, so a predictor always
    singles the junction out, even though its audible-band energy sits within
    the interior's own range (measured above 8 and 12 kHz for every bed).
    """
    n = x.shape[-1]
    mono = x.mean(axis=0)
    centers = np.random.default_rng(7).integers(SEAM_WINDOW, n - SEAM_WINDOW, size=probes)
    span = lambda c, before, after: np.take(mono, np.arange(c - before, c + after), mode="wrap")

    hann = np.hanning(SEAM_WINDOW)
    freqs = np.fft.rfftfreq(SEAM_WINDOW, 1.0 / SR)
    band = (freqs > 50) & (freqs < 16000)
    spectrum_db = lambda seg: 20 * np.log10(np.abs(np.fft.rfft(seg * hann))[band] + 1e-9)

    error = prediction_residual(mono) ** 2 if prediction else None

    def stats(c: int) -> tuple[float, float, float, float]:
        before, after = span(c, SEAM_WINDOW, 0), span(c, 0, SEAM_WINDOW)
        level = abs(np.log(rms(before) + 1e-12) - np.log(rms(after) + 1e-12))
        flux = float(np.mean(np.abs(spectrum_db(before) - spectrum_db(after))))
        click = float(np.sum(np.diff(span(c, 64, 64), 2) ** 2))
        residual = float(np.sum(np.take(error, np.arange(c, c + LPC_ORDER), mode="wrap"))) if error is not None else 0.0
        return level, flux, click, residual

    steps = np.abs(mono - np.roll(mono, 1))  # steps[0] is the seam: x[0] - x[N-1]
    interior = np.array([stats(int(c)) for c in centers])
    seam = stats(0)
    ranks = {
        "step": percentile_of(steps[0], steps[1:]),
        "level": percentile_of(seam[0], interior[:, 0]),
        "spectrum": percentile_of(seam[1], interior[:, 1]),
        "click": percentile_of(seam[2], interior[:, 2]),
    }
    return {**ranks, "residual": percentile_of(seam[3], interior[:, 3])} if prediction else ranks


def seam_ok(metrics: dict | None) -> bool:
    """The seam may not be more extreme than every interior boundary on any statistic."""
    return metrics is not None and all(rank < 100.0 for rank in metrics.values())


def alignment_lag(master: Stereo, decoded: Stereo, span: int = 4096) -> int:
    """Lag (samples) of the best cross-correlation between master and decoded file; 0 = no priming offset."""
    a, b = master.mean(axis=0)[: SR * 4], decoded.mean(axis=0)[: SR * 4]
    corr = np.fft.irfft(np.fft.rfft(b, 2 * a.size) * np.conj(np.fft.rfft(a, 2 * a.size)))
    lags = np.concatenate([np.arange(0, span + 1), np.arange(-span, 0)])
    values = np.concatenate([corr[: span + 1], corr[-span:]])
    return int(lags[np.argmax(values)])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def build(sound: Sound, out_dir: Path) -> dict:
    n = loop_length(sound.seconds) if sound.loop else SR
    master = sum(sound.render(n, np.random.default_rng(sound.seed)).values())
    if sound.loop:
        master = start_at_quietest(master)
    master *= db(sound.lufs - loudness_of_samples(master).integrated)
    path = out_dir / sound.file
    encode(master, path)
    # AAC trims the top octave, so measure the encoded file and correct once.
    correction = sound.lufs - loudness_of_file(path).integrated
    if abs(correction) > 0.05:
        master *= db(correction)
        encode(master, path)
    decoded = decode(path)
    final = loudness_of_file(path)
    meta = probe(path)
    report = {
        "file": sound.file,
        "samples": n,
        "seconds": round(n / SR, 3),
        "bytes": int(meta["format"]["size"]),
        "kbps": round(int(meta["format"]["bit_rate"]) / 1000),
        "lufs": final.integrated,
        "true_peak_dbtp": final.true_peak,
        "lra": final.lra,
        "decoded_samples": decoded.shape[-1],
        "ok": abs(final.integrated - sound.lufs) <= LUFS_TOLERANCE and final.true_peak <= MAX_TRUE_PEAK,
    }
    if sound.loop:
        report["seam_master"] = seam_metrics(master)
        report["seam_decoded"] = seam_metrics(decoded, prediction=False) if decoded.shape[-1] == n else None
        report["lag"] = alignment_lag(master, decoded)
        report["ok"] = bool(report["ok"] and decoded.shape[-1] == n and report["lag"] == 0
                            and seam_ok(report["seam_master"]) and seam_ok(report["seam_decoded"]))
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--out", type=Path, default=OUT_DIR, help="output directory (default: assets/audio)")
    parser.add_argument("--json", action="store_true", help="print the verification report as JSON")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    reports = [build(sound, args.out) for sound in SOUNDS]
    if args.json:
        print(json.dumps(reports, indent=2))
    else:
        fmt = lambda m: "  ".join(f"{k} {v:5.1f}" for k, v in m.items()) if m else "n/a"
        for r in reports:
            print(f"{r['file']:<18} {r['seconds']:7.3f}s  {r['bytes'] / 1e6:5.2f} MB  {r['kbps']:3d} kb/s  "
                  f"{r['lufs']:6.1f} LUFS  TP {r['true_peak_dbtp']:6.1f} dBTP  {'OK' if r['ok'] else 'FAIL'}")
            if "seam_master" in r:
                print(f"{'':<18} seam master  (percentile vs interior) {fmt(r['seam_master'])}")
                print(f"{'':<18} seam decoded (percentile vs interior) {fmt(r['seam_decoded'])}  "
                      f"decoded {r['decoded_samples']}/{r['samples']} samples, lag {r['lag']}")
        print(f"total {sum(r['bytes'] for r in reports) / 1e6:.2f} MB")
    return 0 if all(r["ok"] for r in reports) else 1


if __name__ == "__main__":
    sys.exit(main())
