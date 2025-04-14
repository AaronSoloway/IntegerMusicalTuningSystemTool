// Copy of tuningData.js with CommonJS syntax
const standardConfigs = {
    tuningSystem: ['JI5', 'ET'],
    frequencies: [100, 261.63, 440]
};

function loadTuningData(system, frequency) {
    // ... implementation ...
}

function getCachedCalculation(system, frequency) {
    // ... implementation ...
}

function cacheCalculation(system, frequency, data) {
    // ... implementation ...
}

module.exports = {
    standardConfigs,
    loadTuningData,
    getCachedCalculation,
    cacheCalculation
}; 