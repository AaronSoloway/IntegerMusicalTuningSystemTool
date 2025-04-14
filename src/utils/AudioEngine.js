import * as Tone from 'tone';

class AudioEngine {
    constructor() {
        this.activeNotes = new Map();
        this.initialized = false;
        this.isMuted = true;
        this.volume = -20;  // Default volume in dB
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: "sine"
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.5,
                    release: 0.1
                },
                volume: this.volume
            }).toDestination();
            
            Tone.Destination.volume.value = -Infinity;  // Start muted
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    mute() {
        if (this.synth) {
            Tone.Destination.volume.value = -Infinity;
            this.isMuted = true;
            this.synth.releaseAll();
        }
    }

    async unmute() {
        if (this.synth) {
            try {
                await Tone.start();
                if (Tone.context.state !== 'running') {
                    await Tone.context.resume();
                }
                Tone.Destination.volume.value = this.volume;
                this.isMuted = false;
                this.playAllNotes();
            } catch (error) {
                console.error('Failed to start audio context:', error);
                this.isMuted = true;
                throw error;
            }
        }
    }

    toggleNote(frequency, identifier) {
        if (!this.initialized || !this.synth) return false;
        
        const key = JSON.stringify(identifier);
        
        if (this.activeNotes.has(key)) {
            this.synth.triggerRelease([this.activeNotes.get(key)]);
            this.activeNotes.delete(key);
            return false;
        } else {
            this.activeNotes.set(key, frequency);
            if (!this.isMuted) {
                this.synth.triggerAttack(frequency, undefined, 0.5);
            }
            return true;
        }
    }

    stopAll() {
        if (!this.initialized || !this.synth) return [];
        const deactivatedCells = Array.from(this.activeNotes.keys()).map(key => JSON.parse(key));
        this.synth.releaseAll();
        this.activeNotes.clear();
        return deactivatedCells;
    }

    playAllNotes() {
        if (!this.initialized || !this.synth || this.isMuted) return;
        
        this.synth.releaseAll();
        
        for (const [_, frequency] of this.activeNotes) {
            this.synth.triggerAttack(frequency, undefined, 0.5);
        }
    }

    updateVolume(volumeDb) {
        this.volume = volumeDb;
        if (this.initialized && !this.isMuted) {
            Tone.Destination.volume.value = volumeDb;
        }
    }
}

// Create a singleton instance
const audioEngine = new AudioEngine();
export default audioEngine;