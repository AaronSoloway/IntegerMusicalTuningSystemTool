import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import audioEngine from './utils/AudioEngine';
import calculator from './utils/TuningCalculator';
import Heatmap from './components/Heatmap';
import Controls from './components/Controls';

function App() {
    const [isMuted, setIsMuted] = useState(true);
    const [visualData, setVisualData] = useState({
        data: calculator.errorInCents,
        range: 0.5
    });
    const [activeNotes, setActiveNotes] = useState([]);
    const [volume, setVolume] = useState(-30);  // Default to -30dB

    // Add URL parameter handling
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('custom') && params.has('system') && params.has('freq')) {
            const system = params.get('system');
            const freq = parseFloat(params.get('freq'));
            
            // Validate parameters
            if (calculator.systems[system] && freq >= 20 && freq <= 2000) {
                calculator.updateTuningSystem(system);
                calculator.updateTonicFrequency(freq);
                setVisualData(prev => ({
                    ...prev,
                    data: calculator.errorInCents
                }));
            }
        }
    }, []);

    // Add function to update URL
    const updateURL = useCallback((system, freq) => {
        const params = new URLSearchParams(window.location.search);
        params.set('custom', '1');
        params.set('system', system);
        params.set('freq', freq.toString());
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    }, []);

    const handleToggleAudio = async () => {
        try {
            if (!audioEngine.initialized) {
                await audioEngine.initialize();
                // When initializing, sync audio engine with current visual state
                activeNotes.forEach(note => {
                    const frequency = calculator.sonicFrequencies[note.ordinal][note.step];
                    audioEngine.activeNotes.set(JSON.stringify(note), frequency);
                });
            }
            
            if (audioEngine.isMuted) {
                await audioEngine.unmute();
                setIsMuted(false);
            } else {
                audioEngine.mute();
                setIsMuted(true);
            }
        } catch (error) {
            console.error('Failed to toggle audio:', error);
        }
    };

    const handleCellClick = useCallback((col, row) => {
        const note = { step: col, ordinal: row };
        const noteKey = JSON.stringify(note);
        
        setActiveNotes(prev => {
            const isActive = prev.some(n => n.step === col && n.ordinal === row);
            if (isActive) {
                return prev.filter(n => !(n.step === col && n.ordinal === row));
            } else {
                return [...prev, note];
            }
        });

        if (audioEngine.initialized) {
            const frequency = calculator.sonicFrequencies[row][col];
            audioEngine.toggleNote(frequency, note);
        }
    }, []);

    // Modify handlers to update URL
    const handleSystemChange = useCallback(() => {
        setVisualData(prev => ({
            ...prev,
            data: calculator.errorInCents
        }));
        updateURL(calculator.tuningSystem, calculator.tonicFreq);
    }, [updateURL]);

    const handleTonicChange = useCallback((newFreq) => {
        calculator.updateTonicFrequency(newFreq);
        setVisualData(prev => ({
            ...prev,
            data: calculator.errorInCents
        }));
        updateURL(calculator.tuningSystem, newFreq);
    }, [updateURL]);

    const handleRangeChange = useCallback((newRange) => {
        setVisualData(prev => ({
            ...prev,
            range: newRange
        }));
    }, []);

    const handleVolumeChange = useCallback((newVolume) => {
        setVolume(newVolume);
        if (audioEngine.initialized && !audioEngine.isMuted) {
            audioEngine.updateVolume(newVolume);
        }
    }, []);

    // Memoize data passed to Heatmap
    const heatmapProps = useMemo(() => ({
        data: visualData.data,
        ordinalLabels: calculator.ordinalArrayOfStrings,
        pitchLabels: calculator.scaleDegreeNames12ToneChromatic.slice(0, calculator.numPitches),
        title: `${calculator.systems[calculator.tuningSystem].name} Scale vs. Ordinal`,
        range: visualData.range
    }), [visualData.data, visualData.range, calculator.tuningSystem]);

    return (
        <div style={{ padding: '20px' }}>
            <h1>Tuning Explorer</h1>
            <Controls 
                onSystemChange={handleSystemChange}
                onTonicChange={handleTonicChange}
                onRangeChange={handleRangeChange}
                onVolumeChange={handleVolumeChange}
                range={visualData.range}
                volume={volume}
            />
            <button 
                onClick={handleToggleAudio}
                className="play-pause-button"
                aria-label={isMuted ? 'Play' : 'Pause'}
            >
                {isMuted ? <PlayArrowIcon /> : <PauseIcon />}
            </button>
            <Heatmap
                {...heatmapProps}
                onCellClick={handleCellClick}
                activeNotes={activeNotes}
            />
        </div>
    );
}

export default App;
