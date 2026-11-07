"use client";

// High-fidelity natural ambient audio mixer (Stereo Rooftop Rain & Warm Vinyl Crackle)
// Uses an authentic, soothing natural rain audio track (/rain.mp3) with seamless looping
// and Web Audio vinyl crackle synthesis.
class CozyAmbientMixer {
  private rainAudio: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private vinylGain: GainNode | null = null;
  private vinylSource: AudioBufferSourceNode | null = null;
  private vinylInitialized = false;

  private initRain() {
    if (this.rainAudio || typeof window === "undefined") return;
    try {
      const audio = new Audio("/rain.mp3");
      audio.loop = true;
      audio.preload = "auto";
      audio.style.display = "none";
      document.body.appendChild(audio);
      this.rainAudio = audio;
    } catch {
      // Audio element creation fallback
    }
  }

  private initVinyl() {
    if (this.vinylInitialized || typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 5;

    const vinylBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const vinylData = vinylBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const hiss = (Math.random() * 2 - 1) * 0.012;
      const pop = Math.random() > 0.9992 ? (Math.random() * 2 - 1) * 0.45 : 0;
      vinylData[i] = hiss + pop;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = vinylBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 0.7;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();

    this.vinylGain = gain;
    this.vinylSource = source;
    this.vinylInitialized = true;
  }

  public setRainVolume(level: number) {
    if (typeof window === "undefined") return;
    this.initRain();
    if (!this.rainAudio) return;

    const clamped = Math.max(0, Math.min(1, level));
    if (clamped > 0) {
      this.rainAudio.volume = clamped * 0.85;
      const promise = this.rainAudio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // In case of browser autoplay hold, attach one-shot window listener
          const unlock = () => {
            void this.rainAudio?.play();
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
          };
          window.addEventListener("pointerdown", unlock, { once: true });
          window.addEventListener("keydown", unlock, { once: true });
        });
      }
    } else {
      this.rainAudio.pause();
    }
  }

  public setVinylVolume(level: number) {
    if (level > 0) this.initVinyl();
    if (this.ctx?.state === "suspended" && level > 0) {
      void this.ctx.resume();
    }
    if (this.vinylGain && this.ctx) {
      this.vinylGain.gain.setTargetAtTime(level * 0.35, this.ctx.currentTime, 0.08);
    }
  }
}

export const ambientMixer = new CozyAmbientMixer();
