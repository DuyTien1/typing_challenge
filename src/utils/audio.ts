export type SwitchType = 'cherry_blue' | 'cherry_brown' | 'cherry_red' | 'thock';

class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private switchType: SwitchType = 'cherry_blue';

  constructor() {
    // Check saved mute state & switch type
    const savedMute = localStorage.getItem('fasttyping_muted');
    this.isMuted = savedMute === 'true';

    const savedSwitch = localStorage.getItem('fasttyping_switch_type') as SwitchType | null;
    if (savedSwitch && ['cherry_blue', 'cherry_brown', 'cherry_red', 'thock'].includes(savedSwitch)) {
      this.switchType = savedSwitch;
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('fasttyping_muted', this.isMuted.toString());
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getSwitchType(): SwitchType {
    return this.switchType;
  }

  public setSwitchType(type: SwitchType) {
    this.switchType = type;
    localStorage.setItem('fasttyping_switch_type', type);
    this.playKeyClickSound(type);
  }

  // Mechanical Keyboard Audio Synthesizer (Giải pháp 5: Web Audio API)
  public playKeyClickSound(soundType: SwitchType | 'spacebar' = this.switchType) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (soundType === 'spacebar') {
        // Spacebar: deep stabilizer thud
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.055);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.055);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
        return;
      }

      switch (soundType) {
        case 'cherry_blue': {
          // Clicky: High-frequency click ramp down
          osc.type = 'sine';
          const startFreq = 1800 + Math.random() * 120 - 60;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
          break;
        }

        case 'cherry_brown': {
          // Tactile: Warm bump, lower frequency
          osc.type = 'triangle';
          const startFreq = 850 + Math.random() * 80 - 40;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
          break;
        }

        case 'cherry_red': {
          // Linear: Soft smooth attack
          osc.type = 'sine';
          const startFreq = 480 + Math.random() * 60 - 30;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.03);

          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.008, now + 0.03);
          break;
        }

        case 'thock': {
          // Deep Thock: Rich low resonance
          osc.type = 'triangle';
          const startFreq = 340 + Math.random() * 40 - 20;
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.05);

          gain.gain.setValueAtTime(0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);
          break;
        }
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // Audio context might need user gesture
    }
  }

  // Key press sound wrapper
  public playKeyClick(isSpace: boolean = false) {
    if (isSpace) {
      this.playKeyClickSound('spacebar');
    } else {
      this.playKeyClickSound(this.switchType);
    }
  }

  // Spacebar / Word completed sound
  public playWordComplete() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  // Error buzz
  public playError() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  // Countdown pip
  public playCountdown(isGo: boolean = false) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (isGo ? 0.3 : 0.15));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + (isGo ? 0.3 : 0.15));
    } catch {}
  }

  // Boss hit damage
  public playBossHit() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {}
  }

  // Shield break
  public playShieldBreak() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {}
  }

  // Victory fanfare
  public playVictory() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, this.ctx!.currentTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(this.ctx!.currentTime + idx * 0.12);
        osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.35);
      });
    } catch {}
  }
}

export const soundFx = new SoundEffects();
