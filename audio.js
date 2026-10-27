/* =============================================================================
   Medieval Quest - procedural audio
   All sounds are synthesised with the Web Audio API, so the game ships with no
   audio files. The AudioContext is created lazily after the first user gesture.
   ============================================================================= */
'use strict';

class SoundManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicVolume = 0.35;
        this.sfxVolume = 0.7;
        this.muted = false;
        this.musicOn = false;
        this.drones = [];
        this.noteTimer = null;
    }

    /** Create or resume the audio context. Must be called from a user gesture. */
    unlock() {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        if (!this.ctx) {
            this.ctx = new AudioCtx();
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            this.musicGain = this.ctx.createGain();
            this.sfxGain = this.ctx.createGain();
            this.musicGain.connect(this.master);
            this.sfxGain.connect(this.master);
            this.applyVolumes();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return true;
    }

    setVolumes(music, sfx) {
        this.musicVolume = music;
        this.sfxVolume = sfx;
        this.applyVolumes();
        if (this.musicOn && music <= 0) this.stopMusic(true);
    }

    setMuted(muted) {
        this.muted = muted;
        this.applyVolumes();
    }

    applyVolumes() {
        if (!this.ctx) return;
        const level = this.muted ? 0 : 1;
        this.master.gain.value = level;
        this.musicGain.gain.value = this.musicVolume * 0.5;
        this.sfxGain.gain.value = this.sfxVolume * 0.6;
    }

    tone(freq, type, duration, { delay = 0, volume = 0.2, slideTo = null } = {}) {
        if (!this.ctx || this.muted || this.sfxVolume <= 0) return;
        const start = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    play(name) {
        if (!this.ctx) return;
        switch (name) {
            case 'click': this.tone(520, 'triangle', 0.08, { volume: 0.12 }); break;
            case 'open': this.tone(330, 'triangle', 0.15, { volume: 0.12 }); this.tone(495, 'triangle', 0.2, { delay: 0.07, volume: 0.1 }); break;
            case 'coin': this.tone(1320, 'sine', 0.12, { volume: 0.12 }); this.tone(1760, 'sine', 0.22, { delay: 0.07, volume: 0.1 }); break;
            case 'attack': this.tone(500, 'sawtooth', 0.22, { volume: 0.1, slideTo: 90 }); break;
            case 'hit': this.tone(110, 'square', 0.18, { volume: 0.18, slideTo: 55 }); break;
            case 'crit': this.tone(700, 'sawtooth', 0.12, { volume: 0.12, slideTo: 140 }); this.tone(90, 'square', 0.25, { delay: 0.05, volume: 0.2, slideTo: 45 }); break;
            case 'miss': this.tone(300, 'sine', 0.15, { volume: 0.08, slideTo: 200 }); break;
            case 'heal': this.tone(660, 'sine', 0.25, { volume: 0.12 }); this.tone(880, 'sine', 0.3, { delay: 0.1, volume: 0.1 }); break;
            case 'success': this.tone(523, 'triangle', 0.2, { volume: 0.12 }); this.tone(659, 'triangle', 0.2, { delay: 0.12, volume: 0.12 }); this.tone(784, 'triangle', 0.35, { delay: 0.24, volume: 0.12 }); break;
            case 'quest': this.tone(392, 'triangle', 0.2, { volume: 0.12 }); this.tone(587, 'triangle', 0.35, { delay: 0.14, volume: 0.12 }); break;
            case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 'triangle', 0.4, { delay: i * 0.12, volume: 0.13 })); break;
            case 'error': this.tone(180, 'sawtooth', 0.2, { volume: 0.12, slideTo: 120 }); break;
            case 'defeat': this.tone(220, 'sawtooth', 0.6, { volume: 0.15, slideTo: 55 }); break;
            default: break;
        }
    }

    /* Ambient music: a low drone plus soft, sparse notes in the Dorian mode. */
    startMusic() {
        if (!this.ctx || this.musicOn || this.musicVolume <= 0) return;
        this.musicOn = true;
        [55, 82.41, 110].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            osc.type = i === 2 ? 'sine' : 'triangle';
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.value = 400;
            gain.gain.value = 0.22 / (i + 1);
            lfo.frequency.value = 0.08 + i * 0.03;
            lfoGain.gain.value = 3;
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            osc.start();
            lfo.start();
            this.drones.push({ osc, lfo, gain });
        });
        this.scheduleNote();
    }

    scheduleNote() {
        const scale = [220, 246.94, 261.63, 293.66, 329.63, 369.99, 392, 440, 493.88];
        this.noteTimer = setTimeout(() => {
            if (!this.musicOn || !this.ctx) return;
            if (!this.muted) {
                const freq = scale[Math.floor(Math.random() * scale.length)];
                const start = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.0001, start);
                gain.gain.exponentialRampToValueAtTime(0.18, start + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.2);
                osc.connect(gain);
                gain.connect(this.musicGain);
                osc.start(start);
                osc.stop(start + 3.3);
            }
            this.scheduleNote();
        }, 3500 + Math.random() * 5000);
    }

    stopMusic() {
        this.musicOn = false;
        clearTimeout(this.noteTimer);
        this.drones.forEach(d => {
            try { d.osc.stop(); d.lfo.stop(); } catch (e) { /* already stopped */ }
        });
        this.drones = [];
    }
}

const audio = new SoundManager();
