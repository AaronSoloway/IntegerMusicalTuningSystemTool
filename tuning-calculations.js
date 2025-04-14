class TuningCalculator {
    constructor(maxOrdinal = 500, numPitches = 60, tonicFreq = 100, tuningSystem = 'JI5') {
        if (typeof tonicFreq !== 'number' || isNaN(tonicFreq)) {
            console.error('Invalid tonic frequency:', tonicFreq);
            tonicFreq = 100;  // fallback to default
        }
        console.log('TuningCalculator constructor called with:');
        console.log('  maxOrdinal:', maxOrdinal);
        console.log('  numPitches:', numPitches);
        console.log('  tonicFreq:', tonicFreq);
        console.log('  tuningSystem:', tuningSystem);
        this.maxOrdinal = maxOrdinal;
        this.numPitches = numPitches;
        this.tonicFreq = tonicFreq;
        this.tuningSystem = tuningSystem;
        
        // Define tuning systems
        this.systems = {
            JI5: {
                name: 'Just Intonation (5-limit)',
                baseRatios: [
                    {numerator: 1, denominator: 1, value: 1/1},
                    {numerator: 16, denominator: 15, value: 16/15},
                    {numerator: 9, denominator: 8, value: 9/8},
                    {numerator: 6, denominator: 5, value: 6/5},
                    {numerator: 5, denominator: 4, value: 5/4},
                    {numerator: 4, denominator: 3, value: 4/3},
                    {numerator: 45, denominator: 32, value: 45/32},
                    {numerator: 3, denominator: 2, value: 3/2},
                    {numerator: 8, denominator: 5, value: 8/5},
                    {numerator: 5, denominator: 3, value: 5/3},
                    {numerator: 9, denominator: 5, value: 9/5},
                    {numerator: 15, denominator: 8, value: 15/8}
                ],
                calculatePitch: (ordinal, step, baseRatios) => {
                    const octave = Math.floor(step / 12);
                    const ratio = baseRatios[step % 12].value * Math.pow(2, octave);
                    return ordinal * ratio;
                }
            },
            ET: {
                name: 'Equal Temperament',
                baseRatios: Array.from({length: 12}, (_, i) => Math.pow(2, i/12)),
                calculatePitch: (ordinal, step, baseRatios) => {
                    const octave = Math.floor(step / 12);
                    const ratio = baseRatios[step % 12] * Math.pow(2, octave);
                    return ordinal * ratio;
                }
            }
        };

        this.scaleDegreeNames12ToneChromatic = [
            "P1", "m2", "M2", "m3", "M3", "P4", "A4", "P5", "m6", "M6", "m7", "M7",
            "P8", "m9", "M9", "m10", "M10", "P11", "A11", "P12", "m13", "M13", "m14", "M14",
            "P15", "m16", "M16", "m17", "M17", "P18", "A18", "P19", "m20", "M20", "m21", "M21",
            "P22", "m23", "M23", "m24", "M24", "P25", "A25", "P26", "m27", "M27", "m28", "M28",
            "P29", "m30", "M30", "m31", "M31", "P32", "A32", "P33", "m34", "M34", "m35", "M35",
            "P36"
        ];
        
        this.initialize();
    }

    initialize() {
        this.ordinalArrayOfInts = Array.from({length: this.maxOrdinal}, (_, i) => i + 1);
        this.ordinalArrayOfStrings = this.ordinalArrayOfInts.map(String);
        this.calculateScales();
        this.calculateErrors();
    }

    calculateScales() {
        const baseRatios = this.systems[this.tuningSystem].baseRatios;
        
        this.justInt = [];
        for (let octave = 0; octave < Math.ceil(this.numPitches / 12); octave++) {
            baseRatios.forEach(ratio => {
                if (this.justInt.length < this.numPitches) {
                    this.justInt.push(ratio * Math.pow(2, octave));
                }
            });
        }
    }

    calculateErrors() {
        this.exactScaleValues = [];
        this.roundedScaleValues = [];
        this.errorInCents = [];
        this.sonicFrequencies = [];

        const system = this.systems[this.tuningSystem];

        for (let ord = 0; ord < this.maxOrdinal; ord++) {
            this.exactScaleValues[ord] = [];
            this.roundedScaleValues[ord] = [];
            this.errorInCents[ord] = [];
            this.sonicFrequencies[ord] = [];
            
            for (let step = 0; step < this.numPitches; step++) {
                // Use the tuning system's pitch calculation method
                const exactPitch = system.calculatePitch(
                    this.ordinalArrayOfInts[ord],
                    step,
                    system.baseRatios
                );
                this.exactScaleValues[ord][step] = exactPitch;

                // Round the exact pitch to nearest integer
                const roundedPitch = Math.round(exactPitch);
                this.roundedScaleValues[ord][step] = roundedPitch;

                // Calculate error using original formula
                this.errorInCents[ord][step] = this.centsDifference(
                    roundedPitch,  // f1 (actual pitch)
                    exactPitch     // f2 (target pitch)
                );

                // Calculate frequency for sonification
                this.sonicFrequencies[ord][step] = (roundedPitch / this.ordinalArrayOfInts[ord]) * this.tonicFreq;
            }
        }
    }

    updateTuningSystem(system) {
        if (this.systems[system]) {
            console.log('Updating tuning system to:', system);
            this.tuningSystem = system;
            this.calculateScales();
            this.calculateErrors();
            console.log('New sonic frequencies calculated:', 
                this.sonicFrequencies.slice(0, 2).map(row => row.slice(0, 3)));
        }
    }

    updateTonicFrequency(newFreq) {
        this.tonicFreq = newFreq;
        this.calculateErrors();
    }

    centsDifference(f1, f2) {
        return parseFloat((1200 * Math.log2(f1 / f2)).toFixed(4));
    }

    getHoverData() {
        // Create a 3D array combining exact values, rounded values, and frequencies
        return this.exactScaleValues.map((row, i) => 
            row.map((exactValue, j) => [
                exactValue,                    // target holes
                this.roundedScaleValues[i][j], // effective holes
                this.sonicFrequencies[i][j],   // frequency
                this.getCalculationString(j)    // calculation formula
            ])
        );
    }

    getCalculationString(step) {
        const system = this.systems[this.tuningSystem];
        if (this.tuningSystem === 'JI5') {
            const baseRatio = system.baseRatios[step % 12];
            const octave = Math.floor(step / 12);
            if (octave === 0) {
                return `${baseRatio.numerator}/${baseRatio.denominator}`;
            }
            return `${baseRatio.numerator}/${baseRatio.denominator} × 2^${octave}`;
        } else {
            // Equal temperament
            return `2^(${step}/12)`;
        }
    }
} 