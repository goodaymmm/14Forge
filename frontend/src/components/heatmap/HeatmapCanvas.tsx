import React, { useRef, useEffect, useCallback, useState } from 'react';
import { HeatmapCanvasProps, Position } from './types';
import { valueToColor } from './utils/colorScale';
import { canvasToGrid } from './utils/gridCalculation';
import { applyGaussianBlur, normalizeGrid } from './utils/coordinateTransform';

// Define Summoner's Rift playable area boundaries
// Based on backend coordinates: MAP_MIN=570, MAP_MAX=14870
// Coordinates are in grid cells (0-49 for 50x50 grid)
const PLAYABLE_BOUNDS = {
  // Aligned with backend transformation (heatmap.ts lines 375-378)
  // Backend uses 570-14870 range, normalized to 0-1, then scaled to grid
  minX: 2,   // Small buffer for edge cases
  maxX: 48,  // 50 grid cells minus buffer
  minY: 2,   // Y-axis follows same bounds
  maxY: 47,  // Adjusted to 47 for proper grid alignment
};

// Check if a grid cell is within the playable area
const isInPlayableArea = (x: number, y: number): boolean => {
  // Basic rectangular boundary check
  if (x < PLAYABLE_BOUNDS.minX || x > PLAYABLE_BOUNDS.maxX ||
      y < PLAYABLE_BOUNDS.minY || y > PLAYABLE_BOUNDS.maxY) {
    return false;
  }
  
  // Additional corner cutoffs based on the map shape
  // Adjusted for new boundaries (2-48 instead of 3-46)
  // Top-left corner
  if (x < 10 && y < 10) {
    return (x + y) >= 8;
  }
  // Top-right corner
  if (x > 40 && y < 10) {
    return (50 - x + y) >= 8;
  }
  // Bottom-left corner
  if (x < 10 && y > 40) {
    return (x + 50 - y) >= 8;
  }
  // Bottom-right corner
  if (x > 40 && y > 40) {
    return (100 - x - y) >= 8;
  }
  
  return true;
};

export const HeatmapCanvas: React.FC<HeatmapCanvasProps> = ({
  data,
  width,
  height,
  colorScheme = 'viridis',
  showGrid = false,
  opacity = 0.7,
  onHover,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  // Draw heatmap on canvas
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[HeatmapCanvas] Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('[HeatmapCanvas] Canvas context not available');
      return;
    }

    console.log('[HeatmapCanvas] Drawing heatmap:', {
      gridSize: data.gridSize,
      width,
      height,
      hasData: data.grid && data.grid.length > 0
    });

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw non-playable area overlay first
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        if (!isInPlayableArea(x, y)) {
          const cellWidth = width / data.gridSize;
          const cellHeight = height / data.gridSize;
          ctx.fillRect(
            x * cellWidth,
            y * cellHeight,
            cellWidth,
            cellHeight
          );
        }
      }
    }
    
    // Apply Gaussian blur for smoother visualization
    const blurredGrid = applyGaussianBlur(data.grid, 2);
    const normalizedGrid = normalizeGrid(blurredGrid);

    // Get grid stats for color scaling (not currently used but available for future enhancements)
    // const stats = getGridStats(normalizedGrid);
    
    // Cell dimensions
    const cellWidth = width / data.gridSize;
    const cellHeight = height / data.gridSize;

    // Draw heatmap cells with gradient effect
    let hasAnyData = false;
    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        // Only draw heatmap data in playable areas
        if (!isInPlayableArea(x, y)) {
          continue;
        }
        
        const value = normalizedGrid[y][x];
        
        if (value > 0.01) { // Lower threshold for blurred data
          hasAnyData = true;
          
          // Create radial gradient for each cell
          const centerX = x * cellWidth + cellWidth / 2;
          const centerY = y * cellHeight + cellHeight / 2;
          const radius = Math.max(cellWidth, cellHeight) * 0.8;
          
          const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
          );
          
          const color = valueToColor(value, 0, 1, colorScheme);
          gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${opacity})`));
          gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
          
          ctx.fillStyle = gradient;
          ctx.fillRect(
            x * cellWidth - cellWidth * 0.5,
            y * cellHeight - cellHeight * 0.5,
            cellWidth * 2,
            cellHeight * 2
          );
        }
      }
    }
    
    // Log if no data was drawn
    if (!hasAnyData) {
      console.log('[HeatmapCanvas] No data to draw - all grid values are below threshold');
    }

    // Reset alpha
    ctx.globalAlpha = 1;

    // Draw grid lines if enabled
    if (showGrid) {
      // Draw grid only in playable area
      for (let y = 0; y < data.gridSize; y++) {
        for (let x = 0; x < data.gridSize; x++) {
          if (isInPlayableArea(x, y)) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(
              x * cellWidth,
              y * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        }
      }
    }
    
    // Draw boundary outline
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Draw boundary between playable and non-playable areas
    for (let y = 0; y < data.gridSize; y++) {
      for (let x = 0; x < data.gridSize; x++) {
        if (isInPlayableArea(x, y)) {
          // Check if any neighbor is non-playable
          const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
          ];
          
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= data.gridSize || ny < 0 || ny >= data.gridSize ||
                !isInPlayableArea(nx, ny)) {
              // Draw border on this edge
              if (nx < x) ctx.strokeRect(x * cellWidth, y * cellHeight, 1, cellHeight);
              if (nx > x) ctx.strokeRect((x + 1) * cellWidth, y * cellHeight, 1, cellHeight);
              if (ny < y) ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, 1);
              if (ny > y) ctx.strokeRect(x * cellWidth, (y + 1) * cellHeight, cellWidth, 1);
            }
          }
        }
      }
    }
    
    ctx.setLineDash([]); // Reset line dash

    // Highlight hovered cell
    if (hoveredCell) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredCell.x * cellWidth,
        hoveredCell.y * cellHeight,
        cellWidth,
        cellHeight
      );
    }
  }, [data, width, height, colorScheme, showGrid, opacity, hoveredCell]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridPos = canvasToGrid(x, y, width, height, data.gridSize);
    
    if (gridPos.x >= 0 && gridPos.x < data.gridSize && 
        gridPos.y >= 0 && gridPos.y < data.gridSize &&
        isInPlayableArea(gridPos.x, gridPos.y)) {
      setHoveredCell(gridPos);
      const value = data.grid[gridPos.y][gridPos.x];
      onHover?.(gridPos, value);
    } else {
      setHoveredCell(null);
      onHover?.(null, null);
    }
  }, [data, width, height, onHover]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    onHover?.(null, null);
  }, [onHover]);

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridPos = canvasToGrid(x, y, width, height, data.gridSize);
    
    if (gridPos.x >= 0 && gridPos.x < data.gridSize && 
        gridPos.y >= 0 && gridPos.y < data.gridSize &&
        isInPlayableArea(gridPos.x, gridPos.y)) {
      onClick?.(gridPos);
    }
  }, [data, width, height, onClick]);

  // Redraw when dependencies change
  useEffect(() => {
    drawHeatmap();
  }, [drawHeatmap]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 cursor-crosshair"
      style={{ 
        mixBlendMode: 'screen',
        opacity: 0.9
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
};