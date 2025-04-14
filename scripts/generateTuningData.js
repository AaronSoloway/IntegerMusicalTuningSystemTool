const fs = require('fs');
const path = require('path');
const TuningCalculator = require('./TuningCalculator');
const { standardConfigs } = require('./tuningData');

async function generateDataFiles() {
    const outputDir = path.join(process.cwd(), 'src', 'data');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate data for each combination
    for (const system of standardConfigs.tuningSystem) {
        for (const freq of standardConfigs.frequencies) {
            console.log(`Generating data for ${system}-${freq}...`);
            
            const calc = new TuningCalculator(500, 60, parseFloat(freq), system);
            
            const data = {
                exactScaleValues: calc.exactScaleValues,
                roundedScaleValues: calc.roundedScaleValues,
                errorInCents: calc.errorInCents,
                sonicFrequencies: calc.sonicFrequencies
            };

            const filename = path.join(outputDir, `${system}-${freq}.json`);
            fs.writeFileSync(filename, JSON.stringify(data));
            console.log(`Written ${filename}`);
        }
    }
}

generateDataFiles().catch(console.error); 