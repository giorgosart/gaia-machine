// Procedural WebAudio: synthesizes ambient music + UI/game SFX with no asset files.
// All sounds use a shared AudioContext with a master + music + sfx gain split, so
// volume toggles work consistently across the game.

type Bus = 'music' | 'sfx';

class AudioEngine {
  ctx!: AudioContext;
  master!: GainNode;
  musicGain!: GainNode;
  sfxGain!: GainNode;
  musicEnabled = true;
  sfxEnabled = true;
  private currentMusic: { stop: () => void } | null = null;
  private currentTrack: 'menu' | 'game' | null = null;
  private musicDuckTarget = 1;

  init() {
    if (this.ctx) return;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new Ctx();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.6; this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.8; this.sfxGain.connect(this.master);
  }

  resume() {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMusicEnabled(on: boolean) {
    this.musicEnabled = on;
    if (this.musicGain) this.musicGain.gain.linearRampToValueAtTime(on ? this.musicDuckTarget * 0.6 : 0, this.ctx.currentTime + 0.3);
  }
  setSfxEnabled(on: boolean) {
    this.sfxEnabled = on;
    if (this.sfxGain) this.sfxGain.gain.linearRampToValueAtTime(on ? 0.8 : 0, this.ctx.currentTime + 0.2);
  }
  duck(amount: number) {
    this.musicDuckTarget = amount;
    if (this.musicGain && this.musicEnabled) {
      this.musicGain.gain.linearRampToValueAtTime(amount * 0.6, this.ctx.currentTime + 0.4);
    }
  }

  // ---- low-level voice ----
  private envOsc(type: OscillatorType, freq: number, dur: number, vol: number, bus: Bus, opts: {
    attack?: number; decay?: number; pan?: number; detune?: number; slideTo?: number;
  } = {}) {
    if (bus === 'sfx' && !this.sfxEnabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const dest = bus === 'music' ? this.musicGain : this.sfxGain;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t + dur);
    const a = opts.attack ?? 0.01;
    const d = opts.decay ?? dur - a;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, vol: number, bus: Bus, freq = 1000, q = 1) {
    if (bus === 'sfx' && !this.sfxEnabled) return;
    this.resume();
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(bus === 'music' ? this.musicGain : this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---- SFX ----
  hover() { this.envOsc('sine', 880, 0.08, 0.06, 'sfx', { attack: 0.005, decay: 0.07 }); }
  click() {
    this.envOsc('triangle', 660, 0.1, 0.18, 'sfx');
    this.envOsc('sine', 990, 0.12, 0.1, 'sfx', { attack: 0.005 });
  }
  select() {
    this.envOsc('sine', 523, 0.18, 0.18, 'sfx', { slideTo: 784 });
    this.envOsc('triangle', 784, 0.15, 0.1, 'sfx');
  }
  confirm() {
    this.envOsc('sine', 392, 0.22, 0.2, 'sfx');
    this.envOsc('sine', 587, 0.28, 0.18, 'sfx');
    this.envOsc('sine', 784, 0.34, 0.16, 'sfx');
    this.noiseBurst(0.18, 0.04, 'sfx', 4000, 5);
  }
  turn() {
    // mechanical gear/resonance
    this.envOsc('sawtooth', 110, 0.4, 0.06, 'sfx', { slideTo: 80 });
    this.envOsc('sine', 220, 0.5, 0.1, 'sfx');
    this.envOsc('sine', 330, 0.6, 0.08, 'sfx');
    this.noiseBurst(0.25, 0.03, 'sfx', 800, 3);
  }
  warn() {
    this.envOsc('square', 440, 0.18, 0.12, 'sfx', { slideTo: 330 });
    this.envOsc('square', 330, 0.18, 0.1, 'sfx', { slideTo: 220 });
  }
  win() {
    const notes = [523, 659, 784, 988, 1175];
    notes.forEach((n, i) => setTimeout(() => {
      this.envOsc('sine', n, 0.5, 0.18, 'sfx');
      this.envOsc('triangle', n * 2, 0.35, 0.06, 'sfx');
    }, i * 140));
  }
  lose() {
    const notes = [392, 330, 277, 220, 165];
    notes.forEach((n, i) => setTimeout(() => {
      this.envOsc('sawtooth', n, 0.45, 0.12, 'sfx');
      this.envOsc('sine', n / 2, 0.6, 0.1, 'sfx');
    }, i * 180));
  }
  machineActivate(kind: string) {
    if (kind === 'rain') {
      this.noiseBurst(0.5, 0.12, 'sfx', 4000, 1);
      this.envOsc('sine', 220, 0.4, 0.08, 'sfx', { slideTo: 110 });
    } else if (kind === 'magma') {
      this.envOsc('sawtooth', 80, 0.6, 0.18, 'sfx', { slideTo: 50 });
      this.noiseBurst(0.4, 0.1, 'sfx', 200, 2);
    } else if (kind === 'bloom') {
      this.envOsc('sine', 523, 0.4, 0.14, 'sfx', { slideTo: 1046 });
      this.envOsc('triangle', 659, 0.4, 0.1, 'sfx');
    } else if (kind === 'wind') {
      this.noiseBurst(0.7, 0.15, 'sfx', 2000, 0.8);
    } else if (kind === 'purifier') {
      this.envOsc('sine', 880, 0.4, 0.1, 'sfx');
      this.envOsc('sine', 1320, 0.5, 0.08, 'sfx');
    } else if (kind === 'peace') {
      this.envOsc('sine', 440, 0.7, 0.12, 'sfx');
      this.envOsc('sine', 660, 0.7, 0.1, 'sfx');
      this.envOsc('sine', 880, 0.7, 0.08, 'sfx');
    } else {
      this.click();
    }
  }

  // ---- Music: simple looping ambient drone + slow arpeggio ----
  playMusic(track: 'menu' | 'game') {
    this.resume();
    if (this.currentTrack === track) return;
    if (this.currentMusic) this.currentMusic.stop();
    this.currentTrack = track;

    const ctx = this.ctx;
    const out = this.musicGain;
    const stopFns: Array<() => void> = [];

    // Drone pad
    const droneFreqs = track === 'menu' ? [110, 165, 220] : [98, 147, 220, 294];
    const droneOscs: OscillatorNode[] = [];
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 2);
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 800;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 200;
    lfo.connect(lfoG).connect(filt.frequency);
    lfo.start();
    droneFreqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sawtooth' : 'sine';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      const g = ctx.createGain(); g.gain.value = 0.25 / droneFreqs.length;
      o.connect(g).connect(filt);
      o.start();
      droneOscs.push(o);
    });
    filt.connect(droneGain).connect(out);

    // Arpeggio - bell-like
    const scale = track === 'menu'
      ? [220, 277, 330, 415, 523, 659, 784]
      : [196, 247, 294, 392, 494, 587, 784];
    let step = 0;
    const arpInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      const f = scale[Math.floor(Math.random() * scale.length)];
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      const o2 = ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = f * 2;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.02, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(out);
      o2.connect(g2).connect(out);
      o.start(t); o.stop(t + 1.7);
      o2.start(t); o2.stop(t + 1.3);
      step++;
    }, track === 'menu' ? 1700 : 1300);

    // Subtle gear/heartbeat for game track
    let heartInterval: any = null;
    if (track === 'game') {
      heartInterval = setInterval(() => {
        if (!this.musicEnabled) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 55;
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + 0.5);
      }, 2400);
    }

    this.currentMusic = {
      stop: () => {
        clearInterval(arpInterval);
        if (heartInterval) clearInterval(heartInterval);
        const t = ctx.currentTime;
        droneGain.gain.cancelScheduledValues(t);
        droneGain.gain.linearRampToValueAtTime(0, t + 0.6);
        droneOscs.forEach(o => { try { o.stop(t + 0.7); } catch {} });
        try { lfo.stop(t + 0.7); } catch {}
        stopFns.forEach(f => f());
      }
    };
  }

  stopMusic() {
    if (this.currentMusic) { this.currentMusic.stop(); this.currentMusic = null; this.currentTrack = null; }
  }
}

export const audio = new AudioEngine();
