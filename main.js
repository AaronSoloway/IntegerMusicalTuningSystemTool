console.log('Main.js loaded');

// First verify we can get the tonic element
const tonicElement = document.getElementById('tonicFreq');
console.log('Tonic element found:', tonicElement);
if (!tonicElement) {
    throw new Error('Could not find tonic frequency element');
}

// Get and verify the value
const tonicValue = tonicElement.value;
console.log('Tonic element value:', tonicValue);
const initialTonic = parseFloat(tonicValue);
console.log('Parsed tonic value:', initialTonic);

if (isNaN(initialTonic)) {
    throw new Error('Invalid tonic frequency value');
}

try {
    // Now create the calculator with the verified tonic
    const audioEngine = new AudioEngine();
    const calculator = new TuningCalculator(500, 60, initialTonic, 'JI5');
    
    console.log('Created calculator with tonic:', calculator.tonicFreq);

    const visualizations = new TuningVisualizations(audioEngine, calculator);
} catch (error) {
    console.error('Initialization error:', error);
}