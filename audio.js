class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5; // Default volume
        
        this.enabled = true;
        this.musicEnabled = false; // Starts disabled until user interaction
        this.oscillators = [];
    }

    // Initialize audio context (requires user interaction)
    resumeContext() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.musicEnabled = true;
    }

    // Play a generated sound effect
    playTone(freq, type, duration, startTime = 0, vol = 1) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    // UI Sounds
    playHover() {
        // High, very short blip
        this.playTone(800, 'sine', 0.05, 0, 0.1);
    }

    playClick() {
        // Classic select sound
        this.playTone(600, 'square', 0.1, 0, 0.1);
        this.playTone(1200, 'square', 0.1, 0.05, 0.1);
    }

    playError() {
        this.playTone(150, 'sawtooth', 0.3, 0, 0.2);
    }

    playSuccess() {
        // Coin/Success sound
        this.playTone(1000, 'sine', 0.3, 0, 0.1);
        this.playTone(1500, 'sine', 0.4, 0.1, 0.1);
    }

    // Combat Sounds
    playAttack() {
        // Noise-like sweep for sword swing
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playHit() {
        this.playTone(100, 'sawtooth', 0.2, 0, 0.3);
    }

    // Ambient Music (Procedural Drone)
    startAmbience() {
        if (!this.enabled || !this.musicEnabled) return;
        
        // Stop existing ambience if any (simple implementation)
        this.stopAmbience();

        // Create a dark, medieval drone
        const createDrone = (freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.type = 'triangle';
            
            gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
            
            // Subtle LFO for movement
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.2; // slow pulse
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 5; // modulation depth
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();
            lfo.start();
            
            return { osc, lfo };
        };

        this.oscillators.push(createDrone(55));  // A1
        this.oscillators.push(createDrone(110)); // A2
        this.oscillators.push(createDrone(165)); // E3
    }
    
    stopAmbience() {
        this.oscillators.forEach(o => {
            try {
                o.osc.stop();
                o.lfo.stop();
            } catch(e){}
        });
        this.oscillators = [];
    }
}

const audioManager = new SoundManager();
