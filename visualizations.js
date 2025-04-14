class TuningVisualizations {
    constructor(audioEngine, calculator) {
        this.audioEngine = audioEngine;
        this.calculator = calculator;
        this.activeShapes = new Set();
        this.pulseInterval = null;
        this.pulsePhase = 0;
        this.initializeVisualizations();
        this.setupEventListeners();
        this.startPulseAnimation();
        this.loadStateFromURL().catch(error => {
            console.error('Failed to load state from URL:', error);
        });
    }

    initializeVisualizations() {
        this.createHeatmap();
    }

    setupEventListeners() {
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

        // Setup range slider ticks
        const setupRangeTicks = () => {
            const tickValues = [-1, 0, 1, 2, 2.7];  // log10 of [0.1, 1, 10, 100, 500]
            const tickContainer = document.querySelector('.range-ticks');
            tickContainer.innerHTML = tickValues
                .map(v => {
                    const value = sliderToCents(v);
                    // Special case for 500 (2.7 in log scale)
                    if (v === 2.7) return '<span>500</span>';
                    return `<span>${value < 1 ? value.toFixed(1) : value.toFixed(0)}</span>`;
                })
                .join('');
        };

        // Initialize ticks
        setupRangeTicks();

        // Update visualization when slider changes
        document.getElementById('visRange').addEventListener('input', (e) => {
            const cents = sliderToCents(parseFloat(e.target.value));
            document.querySelector('.range-value').textContent = `${formatCents(cents)} cents`;
            this.updateVisualizationRange(cents);
        });

        const tonicFreqSelect = document.getElementById('tonicFreq');
        tonicFreqSelect.addEventListener('change', (e) => {
            const newFreq = parseFloat(e.target.value);
            if (newFreq >= 20 && newFreq <= 2000) {
                this.calculator.updateTonicFrequency(newFreq);
                this.updateHeatmap();
               
                // Update all playing notes with new frequencies
                if (this.audioEngine.initialized && !this.audioEngine.isMuted) {
                    // Stop all current notes
                    this.audioEngine.synth.releaseAll();
                   
                    // Update frequencies and replay notes
                    for (const [key, _] of this.audioEngine.activeNotes) {
                        const note = JSON.parse(key);
                        // Get new frequency based on new tonic
                        const newFrequency = this.calculator.sonicFrequencies[note.ordinal][note.step];
                        // Update stored frequency
                        this.audioEngine.activeNotes.set(key, newFrequency);
                        // Play the new frequency
                        this.audioEngine.synth.triggerAttack(newFrequency, undefined, 0.5);
                    }
                }
            }
        });

        // Allow custom input by double-clicking
        tonicFreqSelect.addEventListener('dblclick', (e) => {
            const currentValue = e.target.value;
            const customValue = prompt('Enter frequency (20-2000 Hz):', currentValue);
            if (customValue !== null) {
                const newFreq = parseFloat(customValue);
                if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 2000) {
                    // Add/update custom option
                    const customOption = tonicFreqSelect.querySelector('option[value="' + currentValue + '"]');
                    if (customOption) {
                        customOption.value = newFreq;
                        customOption.text = `Custom (${newFreq} Hz)`;
                    }
                    tonicFreqSelect.value = newFreq;
                    this.calculator.updateTonicFrequency(newFreq);
                    this.updateHeatmap();
                }
            }
        });

        document.getElementById('tuningSystem').addEventListener('change', (e) => {
            const currentTonic = this.calculator.tonicFreq;  // Save current tonic
            console.log('Changing tuning system, current tonic:', currentTonic);
            this.calculator.updateTuningSystem(e.target.value);
            this.calculator.updateTonicFrequency(currentTonic);  // Restore tonic
            this.updateHeatmap();
            
            // Update all playing notes with new frequencies based on new tuning system
            if (this.audioEngine.initialized && !this.audioEngine.isMuted) {
                console.log('Updating frequencies for new tuning system');
                // Stop all current notes
                this.audioEngine.synth.releaseAll();
                
                // Update frequencies and replay notes
                for (const [key, _] of this.audioEngine.activeNotes) {
                    const note = JSON.parse(key);
                    console.log('Updating note:', note);
                    // Get new frequency based on new tuning system
                    const newFrequency = this.calculator.sonicFrequencies[note.ordinal][note.step];
                    console.log('New frequency:', newFrequency);
                    // Update stored frequency
                    this.audioEngine.activeNotes.set(key, newFrequency);
                    // Play the new frequency
                    this.audioEngine.synth.triggerAttack(newFrequency, undefined, 0.5);
                }
                console.log('Finished updating frequencies');
            }
        });

        document.getElementById('togglePlay').addEventListener('click', async (e) => {
            console.log('Toggle play clicked, current mute state:', this.audioEngine.isMuted);
            if (this.audioEngine.isMuted) {
                try {
                    // Initialize audio if needed
                    if (!this.audioEngine.initialized) {
                        console.log('Initializing audio...');
                        await this.audioEngine.initialize();
                    }
                    // Try to start audio context
                    console.log('Starting Tone.js...');
                    await Tone.start();
                    console.log('Tone.js started, changing button state...');
                    // Change button state before unmuting
                    e.target.textContent = '⏸';
                    console.log('Unmuting audio...');
                    await this.audioEngine.unmute();
                    console.log('Audio unmuted');
                } catch (error) {
                    console.error('Failed to start audio:', error);
                    // Revert button if there's an error
                    e.target.textContent = '▶';
                }
            } else {
                console.log('Muting audio...');
                this.audioEngine.mute();
                e.target.textContent = '▶';
                console.log('Audio muted');
            }
            console.log('After toggle, mute state:', this.audioEngine.isMuted);
        });

        // Update spacebar handler
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                document.getElementById('togglePlay').click();
            }
        });

        document.getElementById('saveState').addEventListener('click', () => {
            const state = {
                system: this.calculator.tuningSystem,
                tonic: document.getElementById('tonicFreq').value,
                range: Math.pow(10, parseFloat(document.getElementById('visRange').value)),
                notes: this.getCompactNoteString()
            };

            const params = new URLSearchParams();
            params.set('system', state.system);
            params.set('tonic', state.tonic);
            params.set('range', state.range);
            params.set('notes', state.notes);

            const newURL = `${window.location.pathname}?${params.toString()}`;
            window.history.pushState(state, '', newURL);

            // Optional: Show feedback to user
            alert('State saved! You can bookmark or share this URL.');
        });

        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            const volumeDb = parseFloat(e.target.value);
            console.log('Volume change to:', volumeDb);
            if (this.audioEngine.initialized && !this.audioEngine.isMuted) {
                Tone.Destination.volume.value = volumeDb;
                this.audioEngine.volume = volumeDb;
            }
        });
    }

    createHeatmap() {
        // Calculate dimensions first
        const containerWidth = document.querySelector('.visualization').clientWidth - 150;
        const cellSize = Math.floor(containerWidth / this.calculator.numPitches);
        const plotWidth = cellSize * this.calculator.numPitches;
        const plotHeight = cellSize * this.calculator.maxOrdinal;

        // Now create heatmap data with access to plotHeight
        const heatmapData = [{
            z: this.calculator.errorInCents,
            y: this.calculator.ordinalArrayOfStrings,
            x: this.calculator.scaleDegreeNames12ToneChromatic.slice(0, this.calculator.numPitches),
            type: 'heatmap',
            bgcolor: '#f0f0f0',  // Match the background color
            hoverongaps: true,
            xgap: 1,
            ygap: 1,
            showscale: true,
            hoverlabel: { bgcolor: 'white' },
            colorscale: [
                [0, 'rgb(0, 0, 255)'],          // Blue for negative values
                [0.49, 'rgb(200, 200, 255)'],   // Light blue
                [0.5, 'rgb(240, 240, 240)'],    // Match background for zero
                [0.51, 'rgb(255, 200, 200)'],   // Light red
                [1, 'rgb(255, 0, 0)']           // Red for positive values
            ],
            zmin: -0.5,
            zmax: 0.5,
            colorbar: {
                title: {
                    text: 'cents',
                    side: 'right',
                    font: { size: 12 },
                    textangle: 180
                },
                len: 0.05,  // Length of colorbar
                y: 1,  // Align with top of heatmap
                yanchor: 'top',
                thickness: 12,
                xanchor: 'left',
                x: 1.05  // Move slightly further right
            },
            hovertemplate: '<b>interval name:</b> %{x}<br>' +
                         '<b>interval calc:</b> %{customdata[3]}<br>' +
                         '<b>ordinal:</b> %{y}<br>' +
                         '<b>target holes:</b> %{customdata[0]:.3f}<br>' +
                         '<b>effective holes:</b> %{customdata[1]}<br>' +
                         '<b>error:</b> %{z:.2f} cents<br>' +
                         '<b>frequency:</b> %{customdata[2]:.2f} Hz<extra></extra>',
            customdata: this.calculator.getHoverData()
        }];

        const layout = {
            title: `${this.calculator.systems[this.calculator.tuningSystem].name} Scale vs. Ordinal`,
            width: plotWidth + 150,
            height: plotHeight + 60,
            plot_bgcolor: '#dcdcdc',
            paper_bgcolor: '#dcdcdc',
            grid: {
                rows: 1,
                columns: 1,
                pattern: 'independent',
                roworder: 'top to bottom'
            },
            margin: {
                l: 80,
                r: 100,
                t: 120,
                b: 80
            },
            yaxis: {
                title: 'Ordinal (Spatial Frequency of Innermost Ring',
                autorange: 'reversed',
                tickmode: 'array',
                ticktext: this.calculator.ordinalArrayOfStrings,
                tickvals: Array.from({length: this.calculator.maxOrdinal}, (_, i) => i + 1)
            },
            xaxis: {
                title: 'Scale Degree',
                tickmode: 'array',
                ticktext: this.calculator.scaleDegreeNames12ToneChromatic.slice(0, this.calculator.numPitches),
                tickvals: Array.from({length: this.calculator.numPitches}, (_, i) => i),
                tickangle: 90,
                side: 'top',      // Move axis to top
                title: {
                    standoff: 15  // Add space between title and ticks
                }
            },
            yaxis_scaleanchor: "x",
            yaxis_scaleratio: 1,  // Force square aspect ratio
            hovermode: 'closest',
            clickmode: 'none',
            dragmode: false,
            spikedistance: -1
        };

        // Create the plot with configuration
        Plotly.newPlot('heatmap', heatmapData, layout, {
            displayModeBar: false,
            scrollZoom: false,
            doubleClick: false,
            showTips: false
        });

        // Add our own click handler to the plot div
        const heatmapDiv = document.getElementById('heatmap');
        heatmapDiv.addEventListener('click', async (event) => {
            const rect = heatmapDiv.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Get plot area dimensions
            const plotArea = heatmapDiv.querySelector('.plot');
            if (!plotArea) return;

            const plotRect = plotArea.getBoundingClientRect();
            const plotX = x - (plotRect.left - rect.left);
            const plotY = y - (plotRect.top - rect.top);

            // Convert click coordinates to cell indices
            const xScale = this.calculator.numPitches / plotRect.width;
            const yScale = this.calculator.maxOrdinal / plotRect.height;

            const col = Math.floor(plotX * xScale) + 1;
            const row = Math.floor(plotY * yScale) + 1;

            // Check if click is within valid range
            if (col >= 1 && col <= this.calculator.numPitches &&
                row >= 1 && row <= this.calculator.maxOrdinal) {
                
                console.log('Click detected at cell:', col, row);
                
                // Initialize audio if needed
                if (!this.audioEngine.initialized) {
                    await this.audioEngine.initialize();
                }

                const frequency = this.calculator.sonicFrequencies[row-1][col-1];
                const isActive = this.audioEngine.toggleNote(frequency, {
                    step: col-1,
                    ordinal: row-1
                });

                this.updateCell([col-1, row-1], isActive);
            }
        });
    }

    startPulseAnimation() {
        let lastFrame = 0;
        this.pulseInterval = setInterval(() => {
            if (this.activeShapes.size > 0) {
                const now = performance.now();
                // Limit updates to every 50ms
                if (now - lastFrame < 50) return;
                lastFrame = now;

                this.pulsePhase = (this.pulsePhase + 1) % 100;
                const brightness = Math.abs(Math.sin(this.pulsePhase * Math.PI / 50)) * 155 + 100;
                
                const shapes = Array.from(this.activeShapes).map(shapeKey => {
                    const [row, col] = JSON.parse(shapeKey);
                    const crossSize = 0.35;
                    return [{
                        type: 'line',
                        x0: col - crossSize,
                        x1: col + crossSize,
                        y0: row + 1 - crossSize,
                        y1: row + 1 + crossSize,
                        line: {
                            color: `rgb(0, ${brightness}, 0)`,
                            width: 3,
                        }
                    }, {
                        type: 'line',
                        x0: col - crossSize,
                        x1: col + crossSize,
                        y0: row + 1 + crossSize,
                        y1: row + 1 - crossSize,
                        line: {
                            color: `rgb(0, ${brightness}, 0)`,
                            width: 3,
                        }
                    }];
                }).flat();
                Plotly.relayout('heatmap', { shapes: shapes });
            }
        }, 16);  // Check more frequently but limit actual updates
    }

    updateCell(pointIndex, isActive) {
        if (isActive) {
            this.activeShapes.add(JSON.stringify([pointIndex[1], pointIndex[0]]));
        } else {
            this.activeShapes.delete(JSON.stringify([pointIndex[1], pointIndex[0]]));
        }
        
        // Update shapes
        const shapes = this.activeShapes.size > 0 
            ? Array.from(this.activeShapes).map(shapeKey => {
                const [row, col] = JSON.parse(shapeKey);
                const crossSize = 0.35;
                return [{
                    type: 'line',
                    x0: col - crossSize,
                    x1: col + crossSize,
                    y0: row + 1 - crossSize,
                    y1: row + 1 + crossSize,
                    line: {
                        color: `rgb(0, 255, 0)`,
                        width: 3,
                    }
                }, {
                    type: 'line',
                    x0: col - crossSize,
                    x1: col + crossSize,
                    y0: row + 1 + crossSize,
                    y1: row + 1 - crossSize,
                    line: {
                        color: `rgb(0, 255, 0)`,
                        width: 3,
                    }
                }];
            }).flat()
            : [];
        
        Plotly.relayout('heatmap', { shapes: shapes });
    }

    updateActiveCells(cells, isActive) {
        if (isActive) {
            this.activeShapes = new Set(cells.map(cell => JSON.stringify([cell.ordinal, cell.step])));
        } else {
            this.activeShapes.clear();
        }
    }

    updateVisualizationRange(range) {
        const update = {
            'zmin': -range,
            'zmax': range
        };
        Plotly.update('heatmap', update);
    }

    updateHeatmap() {
        const systemName = this.calculator.systems[this.calculator.tuningSystem].name;
        
        const update = {
            z: [this.calculator.errorInCents],
            customdata: [this.calculator.getHoverData()]
        };
        
        const layout = {
            'title.text': `${systemName} Scale vs. Ordinal`
        };
        
        Plotly.update('heatmap', update, layout);
    }

    getCompactNoteString() {
        return Array.from(this.activeShapes)
            .map(shapeKey => {
                const [row, col] = JSON.parse(shapeKey);
                return `O${row + 1}P${col + 1}`;  // Add 1 to convert from 0-based to 1-based
            })
            .sort()  // Sort for consistent URLs
            .join(',');
    }

    async loadStateFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        // Load tuning system
        const tuningSystem = params.get('system');
        if (tuningSystem) {
            document.getElementById('tuningSystem').value = tuningSystem;
            this.calculator.updateTuningSystem(tuningSystem);
        }
        
        // Load tonic frequency
        const tonicFreq = params.get('tonic');
        if (tonicFreq) {
            const freq = parseFloat(tonicFreq);
            if (!isNaN(freq) && freq >= 20 && freq <= 2000) {
                document.getElementById('tonicFreq').value = freq;
                this.calculator.updateTonicFrequency(freq);
            }
        }
        
        // Load active notes
        const activeNotes = params.get('notes');
        if (activeNotes) {
            const notes = activeNotes.split(',').filter(n => n).map(noteStr => {
                const match = noteStr.match(/O(\d+)P(\d+)/);
                if (!match) return null;
                return {
                    ordinal: parseInt(match[1]) - 1,  // Convert back to 0-based
                    step: parseInt(match[2]) - 1
                };
            }).filter(n => n !== null);

            // First initialize audio
            if (!this.audioEngine.initialized) {
                await this.audioEngine.initialize();
            }
            
            // Add all notes to both visual and audio state
            notes.forEach(note => {
                const frequency = this.calculator.sonicFrequencies[note.ordinal][note.step];
                // Add to audio engine's active notes without playing
                this.audioEngine.activeNotes.set(JSON.stringify(note), frequency);
                // Update visual state
                this.updateCell([note.step, note.ordinal], true);  // Note: using [x,y] order
            });
        }
        
        // Load visualization range
        const range = params.get('range');
        if (range) {
            const rangeValue = parseFloat(range);
            document.getElementById('visRange').value = Math.log10(rangeValue);
            document.querySelector('.range-value').textContent = `±${rangeValue} cents`;
            this.updateVisualizationRange(rangeValue);
        }

        this.updateHeatmap();
    }
} 