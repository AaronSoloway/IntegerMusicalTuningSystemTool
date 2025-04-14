import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import calculator from '../utils/TuningCalculator';
import ShareButton from './ShareButton';

const Controls = memo(({ onSystemChange, onTonicChange, onRangeChange, range, onVolumeChange, volume = -30 }) => {
    const [sliderValue, setSliderValue] = useState(Math.log10(range));
    const [volumeValue, setVolumeValue] = useState(volume);
    const sliderRef = useRef(null);
    const tooltipRef = useRef(null);

    const handleSystemChange = (e) => {
        calculator.updateTuningSystem(e.target.value);
        onSystemChange();
    };

    const handleTonicChange = (e) => {
        const newFreq = parseFloat(e.target.value);
        if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 2000) {
            calculator.updateTonicFrequency(newFreq);
            onTonicChange();
        }
    };

    // Convert slider value (log scale) to cents
    const sliderToCents = (value) => {
        return Math.pow(10, value);
    };

    // Convert cents to formatted string
    const formatCents = (cents) => {
        if (cents >= 1) {
            return `±${cents.toFixed(0)}`;
        } else {
            return `±${cents.toFixed(1)}`;
        }
    };

    const handleRangeChange = (e) => {
        const value = parseFloat(e.target.value);
        setSliderValue(value);
        const cents = sliderToCents(value);
        onRangeChange(cents);
        updateTooltipPosition();
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolumeValue(newVolume);
        onVolumeChange(newVolume);
    };

    const updateTooltipPosition = useCallback(() => {
        if (sliderRef.current && tooltipRef.current) {
            const slider = sliderRef.current;
            const tooltip = tooltipRef.current;
            const sliderRect = slider.getBoundingClientRect();
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            const value = parseFloat(sliderValue);
            const percent = (value - min) / (max - min);
            const tooltipWidth = tooltip.offsetWidth;
            const left = percent * (sliderRect.width - 20) - (tooltipWidth / 2) + 10;
            tooltip.style.left = `${left}px`;
        }
    }, [sliderValue]);

    useEffect(() => {
        updateTooltipPosition();
        window.addEventListener('resize', updateTooltipPosition);
        return () => window.removeEventListener('resize', updateTooltipPosition);
    }, [sliderValue, updateTooltipPosition]);

    return (
        <div className="controls">
            <div className="control-group">
                <label>Tuning System: </label>
                <select onChange={handleSystemChange} defaultValue="JI5">
                    <option value="JI5">Just Intonation (5-limit)</option>
                    <option value="ET">Equal Temperament</option>
                </select>
            </div>
            <div className="control-group">
                <label>Tonic Frequency (Hz): </label>
                <select onChange={handleTonicChange} defaultValue="100">
                    <option value="100">100 Hz</option>
                    <option value="261.63">Middle C (261.63 Hz)</option>
                    <option value="440">A 440 (440 Hz)</option>
                </select>
            </div>
            <div className="controls-row">
                <div className="control-group range-slider-container">
                    <h3 className="range-slider-title">Out-of-Tune Range</h3>
                    <div className="range-slider-wrapper">
                        <input 
                            ref={sliderRef}
                            type="range"
                            min="-1.3"
                            max="2.7"
                            step="0.1"
                            value={sliderValue}
                            onChange={handleRangeChange}
                            className="range-slider"
                        />
                        <div className="range-slider-tooltip" ref={tooltipRef}>
                            {formatCents(sliderToCents(sliderValue))} cents
                        </div>
                        <div className="range-ticks">
                            <span>0.1</span>
                            <span>1</span>
                            <span>10</span>
                            <span>100</span>
                            <span>500</span>
                        </div>
                    </div>
                </div>
                <div className="control-group volume-slider-container">
                    <h3 className="volume-slider-title">Volume</h3>
                    <div className="volume-slider-wrapper">
                        <VolumeUpIcon className="volume-icon" />
                        <input
                            type="range"
                            min="-60"
                            max="0"
                            step="1"
                            value={volumeValue}
                            onChange={handleVolumeChange}
                            className="volume-slider"
                        />
                        <VolumeDownIcon className="volume-icon" />
                    </div>
                </div>
            </div>
            <div className="control-group">
                <ShareButton 
                    system={calculator.tuningSystem}
                    frequency={calculator.tonicFreq}
                />
            </div>
        </div>
    );
});

export default Controls; 