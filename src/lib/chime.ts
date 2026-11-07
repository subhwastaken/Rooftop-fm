type AudioCtor = typeof AudioContext;

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** A soft, looping two-note chime for incoming calls. Returns a stop function. */
export function startRingtone(): () => void {
  const ctx = createContext();
  if (!ctx) return () => {};
  void ctx.resume().catch(() => {});

  const ring = () => {
    const t = ctx.currentTime;
    tone(ctx, 659.25, t, 0.5, 0.09);
    tone(ctx, 880, t + 0.22, 0.7, 0.09);
    tone(ctx, 659.25, t + 1, 0.5, 0.09);
    tone(ctx, 880, t + 1.22, 0.7, 0.09);
  };

  ring();
  const id = window.setInterval(ring, 3200);
  return () => {
    window.clearInterval(id);
    void ctx.close().catch(() => {});
  };
}

/** A gentle ping when someone joins the channel. */
export function playSoftPing() {
  const ctx = createContext();
  if (!ctx) return;
  void ctx.resume().catch(() => {});
  const t = ctx.currentTime;
  tone(ctx, 784, t, 0.5, 0.05);
  tone(ctx, 1046.5, t + 0.12, 0.7, 0.04);
  window.setTimeout(() => void ctx.close().catch(() => {}), 1500);
}

