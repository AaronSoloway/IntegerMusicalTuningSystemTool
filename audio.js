class AudioEngine {
    static get [Symbol.species]() { return AudioEngine; }

    constructor() {
        this.activeNotes = new Map();
        this.initialized = false;
        this.isMuted = true;
        this.volume = -20;  // Default volume in dB
        console.log('AudioEngine constructor called');
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            console.log('Creating synth...');
            // Create a basic polyphonic synth with Tone.Synth
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
            console.log('Synth created and initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            throw error;
        }
    }

    mute() {
        if (this.synth) {
            console.log('Muting audio');
            Tone.Destination.volume.value = -Infinity;
            this.isMuted = true;
            this.synth.releaseAll();
        }
    }

    async unmute() {
        if (this.synth) {
            console.log('Unmuting audio');
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
                return;
            }
        }
    }

    playNote(frequency, identifier) {
        if (!this.initialized || !this.synth) return;
        
        const key = JSON.stringify(identifier);
        if (!this.activeNotes.has(key)) return;

        // Always trigger release first to ensure clean playback
        this.synth.triggerRelease([frequency]);
        if (!this.isMuted) {
            this.synth.triggerAttack(frequency, undefined, 0.5);
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
                this.synth.triggerAttack(frequency, undefined, 0.5, this.volume);
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
        console.log('playAllNotes called, muted:', this.isMuted, 'active notes:', this.activeNotes.size);
        if (!this.initialized || !this.synth || this.isMuted) {
            console.log('Cannot play notes: initialized:', this.initialized, 'has synth:', !!this.synth, 'muted:', this.isMuted);
            return;
        }
        
        console.log('Playing all notes...');
        // Stop any currently playing notes
        this.synth.releaseAll();
        
        // Play all active notes
        for (const [key, frequency] of this.activeNotes) {
            console.log('Playing note:', frequency, 'Hz');
            this.synth.triggerAttack(frequency, undefined, 0.5);
        }
        console.log('All notes played');
    }
} 