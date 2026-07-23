let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}

/** Soft white-noise burst for scratch interactions */
export function playScratchNoise(durationMs = 40) {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume();

  const bufferSize = Math.floor(ctx.sampleRate * (durationMs / 1000));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.08;
  }

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.6;

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(ctx.destination);
  source.start();
}

/** Ascending 2-tone success chime */
export function playSuccessChime() {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume();

  const tones = [
    { freq: 523.25, start: 0, dur: 0.12 },
    { freq: 783.99, start: 0.11, dur: 0.22 },
  ];

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + tone.start);
    gain.gain.exponentialRampToValueAtTime(
      0.18,
      ctx.currentTime + tone.start + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + tone.start + tone.dur,
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + tone.start);
    osc.stop(ctx.currentTime + tone.start + tone.dur + 0.02);
  }
}
