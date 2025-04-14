// Define the standard configurations
export const standardConfigs = {
    tuningSystem: ['JI5', 'ET'],
    frequencies: [100, 261.63, 440]
};

// Function to load pre-calculated data chunks
export async function loadTuningData(system, frequency) {
    if (standardConfigs.tuningSystem.includes(system) && 
        standardConfigs.frequencies.includes(parseFloat(frequency))) {
        try {
            // Load pre-calculated data chunk
            const data = await import(
                /* webpackChunkName: "tuning-[request]" */
                `../data/${system}-${frequency}.json`
            );
            return data.default;
        } catch (error) {
            console.warn(`Failed to load pre-calculated data for ${system}-${frequency}`, error);
            return null;
        }
    }
    return null;
}

// Cache for custom calculations
const CACHE_VERSION = 1;
const CACHE_PREFIX = 'tuning-calc-v1';
const MAX_CACHE_ITEMS = 10;

export function getCachedCalculation(system, frequency) {
    try {
        const key = `${CACHE_PREFIX}-${system}-${frequency}`;
        const cached = localStorage.getItem(key);
        if (cached) {
            const { version, timestamp, data } = JSON.parse(cached);
            if (version === CACHE_VERSION && Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                return data;
            }
        }
    } catch (error) {
        console.warn('Failed to read from cache', error);
    }
    return null;
}

export function cacheCalculation(system, frequency, data) {
    try {
        const key = `${CACHE_PREFIX}-${system}-${frequency}`;
        const cacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            data
        };
        
        // Manage cache size
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
        if (keys.length >= MAX_CACHE_ITEMS) {
            // Remove oldest item
            const oldest = keys.sort((a, b) => {
                const aData = JSON.parse(localStorage.getItem(a));
                const bData = JSON.parse(localStorage.getItem(b));
                return aData.timestamp - bData.timestamp;
            })[0];
            localStorage.removeItem(oldest);
        }

        localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
        console.warn('Failed to write to cache', error);
    }
} 