import React, { useEffect, useRef, memo } from 'react';
import * as d3 from 'd3';
import calculator from '../utils/TuningCalculator';

const HeatmapComponent = ({ 
  data, 
  ordinalLabels, 
  pitchLabels, 
  onCellClick, 
  activeNotes, 
  title,
  range 
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.length) return;

    // Create tooltip once at component mount
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'heatmap-tooltip')
      .style('opacity', 0)
      .style('position', 'fixed');

    // Calculate dimensions
    const margin = { top: 120, right: 100, bottom: 80, left: 80 };
    const containerWidth = document.querySelector('.visualization')?.clientWidth || 900;
    const width = containerWidth - margin.left - margin.right;
    const cellSize = Math.floor(width / pitchLabels.length);
    const height = cellSize * ordinalLabels.length;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(pitchLabels)
      .padding(0.05);

    const yScale = d3.scaleBand()
      .range([0, height])
      .domain(ordinalLabels)
      .padding(0.05);

    // Create color scale
    const colorScale = d3.scaleLinear()
      .domain([-range, 0, range])
      .range(['blue', '#f0f0f0', 'red']);

    // Get hover data
    const hoverData = calculator.getHoverData();

    // Add cells
    svg.selectAll('rect')
      .data(data.flat())
      .enter()
      .append('rect')
      .attr('x', (d, i) => xScale(pitchLabels[i % pitchLabels.length]))
      .attr('y', (d, i) => yScale(ordinalLabels[Math.floor(i / pitchLabels.length)]))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', d => colorScale(d))
      .style('stroke', 'none')
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const rect = event.target;
        const i = Math.floor(rect.getAttribute('data-index') / pitchLabels.length);
        const j = rect.getAttribute('data-index') % pitchLabels.length;
        const cellData = hoverData[i][j];

        // Highlight the cell
        d3.select(rect)
          .style('stroke', '#000')
          .style('stroke-width', '2px')
          .style('opacity', 0.8);

        // Show tooltip
        tooltip
          .style('opacity', 1)
          .html(`
            <div class="tooltip-header" style="margin-bottom: 5px; font-weight: bold;">
              ${pitchLabels[j]} at Ordinal ${ordinalLabels[i]}
            </div>
            <div class="tooltip-content">
              <div class="tooltip-row">
                <span class="label">Interval:</span>
                <span class="value">${cellData[3]}</span>
              </div>
              <div class="tooltip-row">
                <span class="label">Target:</span>
                <span class="value">${cellData[0].toFixed(3)} holes</span>
              </div>
              <div class="tooltip-row">
                <span class="label">Actual:</span>
                <span class="value">${cellData[1]} holes</span>
              </div>
              <div class="tooltip-row ${Math.abs(d) > range/2 ? 'error-high' : ''}">
                <span class="label">Error:</span>
                <span class="value">${d.toFixed(2)} cents</span>
              </div>
              <div class="tooltip-row">
                <span class="label">Frequency:</span>
                <span class="value">${cellData[2].toFixed(1)} Hz</span>
              </div>
            </div>
          `)
          .style('left', `${event.clientX + 15}px`)
          .style('top', `${event.clientY - 15}px`);
      })
      .on('mouseout', (event) => {
        // Remove highlight
        d3.select(event.target)
          .style('stroke', 'none')
          .style('opacity', 1);

        // Hide tooltip
        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        const i = Math.floor(event.target.getAttribute('data-index') / pitchLabels.length);
        const j = event.target.getAttribute('data-index') % pitchLabels.length;
        onCellClick(j, i);
      })
      .attr('data-index', (d, i) => i);

    // Add X axis
    const xAxis = svg.append('g')
      .style('font-size', '10px')
      .attr('transform', `translate(${xScale.bandwidth()/2},0)`)  // Shift by half cell width to align with centers
      .call(d3.axisTop(xScale));

    // Adjust x-axis labels
    xAxis.selectAll('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -5)  // Move labels further up above ticks
      .attr('x', 10)    // Center horizontally
      .style('text-anchor', 'start')  // Change to 'start' for left alignment
      .attr('dy', '0.5em');  // Fine-tune vertical position

    // Adjust x-axis ticks
    xAxis.selectAll('line')
      .attr('y2', -6)  // Make ticks longer
      .attr('x1', -xScale.bandwidth()/2)  // Center ticks
      .attr('x2', -xScale.bandwidth()/2);

    // Adjust x-axis path (the main axis line)
    xAxis.select('.domain')
      .attr('transform', `translate(${-xScale.bandwidth()/2},0)`);

    // Add Y axis
    svg.append('g')
      .style('font-size', '10px')
      .call(d3.axisLeft(yScale));

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(title);

    // Add active note markers
    activeNotes.forEach(note => {
      svg.append('g')
        .attr('class', 'active-note-marker')
        .attr('transform', `translate(
          ${xScale(pitchLabels[note.step]) + xScale.bandwidth()/2},
          ${yScale(ordinalLabels[note.ordinal]) + yScale.bandwidth()/2}
        )`)
        .call(g => {
          const size = Math.min(xScale.bandwidth(), yScale.bandwidth()) * 0.35;
          g.append('line')
            .attr('x1', -size)
            .attr('y1', -size)
            .attr('x2', size)
            .attr('y2', size)
            .style('stroke', 'rgb(0, 255, 0)')
            .style('stroke-width', 3);
          g.append('line')
            .attr('x1', -size)
            .attr('y1', size)
            .attr('x2', size)
            .attr('y2', -size)
            .style('stroke', 'rgb(0, 255, 0)')
            .style('stroke-width', 3);
        });
    });

    // Return cleanup function
    return () => {
      tooltip.remove();
    };
  }, []); // Empty dependency array

  // Separate effect for data updates
  useEffect(() => {
    if (!data || !data.length) return;

    const svg = d3.select(svgRef.current);
    const tooltip = d3.select('.heatmap-tooltip');

    // Update visualization...
  }, [data, ordinalLabels, pitchLabels, activeNotes, title, range]);

  return (
    <div className="heatmap-container">
      <svg ref={svgRef}></svg>
    </div>
  );
};

const Heatmap = memo(HeatmapComponent);
export default Heatmap; 