import { tuningData } from './tuningData';
import { loadTuningData, getCachedCalculation, cacheCalculation } from './tuningData';

class TuningCalculator {
    constructor(maxOrdinal = 500, numPitches = 60, tonicFreq = 100, tuningSystem = 'JI5') {
        if (typeof tonicFreq !== 'number' || isNaN(tonicFreq)) {
            console.error('Invalid tonic frequency:', tonicFreq);
            tonicFreq = 100;  // fallback to default
        }
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
        
        this.calculationCache = new Map();
        this.commonFrequencies = [100, 261.63, 440];
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
                    this.justInt.push(typeof ratio === 'number' ? ratio : ratio.value);
                }
            });
        }
    }

    async calculateErrors() {
        // First check URL parameters for custom values
        const urlParams = new URLSearchParams(window.location.search);
        const isCustom = urlParams.has('custom') && 
                        urlParams.has('system') && 
                        urlParams.has('freq');

        if (isCustom) {
            // Skip pre-calculated data for custom configurations
            return this.performCalculation();
        }

        // Try to load pre-calculated data
        const preCalcData = await loadTuningData(this.tuningSystem, this.tonicFreq);
        if (preCalcData) {
            this.loadPreCalculatedData(preCalcData);
            return;
        }

        // Try cached custom calculations
        const cachedData = getCachedCalculation(this.tuningSystem, this.tonicFreq);
        if (cachedData) {
            this.loadPreCalculatedData(cachedData);
            return;
        }

        // Perform calculation and cache result
        const result = this.performCalculation();
        cacheCalculation(this.tuningSystem, this.tonicFreq, {
            exactScaleValues: this.exactScaleValues,
            roundedScaleValues: this.roundedScaleValues,
            errorInCents: this.errorInCents,
            sonicFrequencies: this.sonicFrequencies
        });
        return result;
    }

    performCalculation() {
        const cacheKey = `${this.tuningSystem}-${this.tonicFreq}`;
        if (this.calculationCache.has(cacheKey)) {
            const cached = this.calculationCache.get(cacheKey);
            this.exactScaleValues = cached.exact;
            this.roundedScaleValues = cached.rounded;
            this.errorInCents = cached.errors;
            this.sonicFrequencies = cached.frequencies;
            return;
        }

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
                const exactPitch = system.calculatePitch(
                    this.ordinalArrayOfInts[ord],
                    step,
                    system.baseRatios
                );
                this.exactScaleValues[ord][step] = exactPitch;

                const roundedPitch = Math.round(exactPitch);
                this.roundedScaleValues[ord][step] = roundedPitch;

                this.errorInCents[ord][step] = this.centsDifference(
                    roundedPitch,
                    exactPitch
                );

                this.sonicFrequencies[ord][step] = (roundedPitch / this.ordinalArrayOfInts[ord]) * this.tonicFreq;
            }
        }

        // Cache the results
        this.calculationCache.set(cacheKey, {
            exact: this.exactScaleValues,
            rounded: this.roundedScaleValues,
            errors: this.errorInCents,
            frequencies: this.sonicFrequencies
        });

        // Limit cache size
        if (this.calculationCache.size > 10) {
            const firstKey = this.calculationCache.keys().next().value;
            this.calculationCache.delete(firstKey);
        }
    }

    loadPreCalculatedData(data) {
        this.exactScaleValues = data.exactScaleValues;
        this.roundedScaleValues = data.roundedScaleValues;
        this.errorInCents = data.errorInCents;
        this.sonicFrequencies = data.sonicFrequencies;
    }

    updateTuningSystem(system) {
        if (this.systems[system]) {
            this.tuningSystem = system;
            this.calculateScales();
            this.calculateErrors();
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
        return this.exactScaleValues.map((row, i) => 
            row.map((exactValue, j) => [
                exactValue,
                this.roundedScaleValues[i][j],
                this.sonicFrequencies[i][j],
                this.getCalculationString(j)
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
            return `2^(${step}/12)`;
        }
    }

    // Add utility to generate data files for standard configurations
    static async generateDataFiles() {
        const { standardConfigs } = await import('./tuningData');
        const results = {};

        for (const system of standardConfigs.tuningSystem) {
            for (const freq of standardConfigs.frequencies) {
                const calc = new TuningCalculator(500, 60, freq, system);
                await calc.calculateErrors();
                results[`${system}-${freq}`] = {
                    exactScaleValues: calc.exactScaleValues,
                    roundedScaleValues: calc.roundedScaleValues,
                    errorInCents: calc.errorInCents,
                    sonicFrequencies: calc.sonicFrequencies
                };
            }
        }

        return results;
    }
}

// Create a singleton instance
const calculator = new TuningCalculator();
export default calculator; 