import { Position, MAP_SIZE, GRID_SIZE } from '../types';

/**
 * Convert game coordinates to grid coordinates
 */
export function gameToGrid(position: Position, gridSize: number = GRID_SIZE): Position {
  return {
    x: Math.floor((position.x / MAP_SIZE) * gridSize),
    y: Math.floor((position.y / MAP_SIZE) * gridSize)
  };
}

/**
 * Convert grid coordinates to game coordinates (center of cell)
 */
export function gridToGame(gridPos: Position, gridSize: number = GRID_SIZE): Position {
  const cellSize = MAP_SIZE / gridSize;
  return {
    x: gridPos.x * cellSize + cellSize / 2,
    y: gridPos.y * cellSize + cellSize / 2
  };
}

/**
 * Convert canvas pixel coordinates to grid coordinates
 */
export function canvasToGrid(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number = GRID_SIZE
): Position {
  return {
    x: Math.floor((canvasX / canvasWidth) * gridSize),
    y: Math.floor((canvasY / canvasHeight) * gridSize)
  };
}

/**
 * Calculate grid density from raw positions
 */
export function calculateDensityGrid(
  positions: Position[],
  gridSize: number = GRID_SIZE
): number[][] {
  const grid: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  for (const pos of positions) {
    const gridPos = gameToGrid(pos, gridSize);
    if (gridPos.x >= 0 && gridPos.x < gridSize && gridPos.y >= 0 && gridPos.y < gridSize) {
      grid[gridPos.y][gridPos.x]++;
    }
  }

  return grid;
}

/**
 * Apply Gaussian blur to smooth the heatmap
 */
export function gaussianBlur(grid: number[][], radius: number = 1): number[][] {
  const gridSize = grid.length;
  const blurred: number[][] = Array(gridSize)
    .fill(0)
    .map(() => Array(gridSize).fill(0));

  // Simple box blur as approximation
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;

          if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize) {
            sum += grid[ny][nx];
            count++;
          }
        }
      }

      blurred[y][x] = count > 0 ? sum / count : 0;
    }
  }

  return blurred;
}

/**
 * Normalize grid values to 0-1 range
 */
export function normalizeGrid(grid: number[][]): {
  normalized: number[][];
  min: number;
  max: number;
} {
  let min = Infinity;
  let max = -Infinity;

  // Find min and max
  for (const row of grid) {
    for (const value of row) {
      if (value > 0) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  if (min === Infinity) {
    min = 0;
    max = 1;
  }

  // Normalize
  const normalized = grid.map(row =>
    row.map(value => {
      if (value === 0) return 0;
      return (value - min) / (max - min);
    })
  );

  return { normalized, min, max };
}

/**
 * Get grid statistics
 */
export function getGridStats(grid: number[][]) {
  let total = 0;
  let nonZeroCount = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const row of grid) {
    for (const value of row) {
      if (value > 0) {
        total += value;
        nonZeroCount++;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
  }

  return {
    total,
    nonZeroCount,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    average: nonZeroCount > 0 ? total / nonZeroCount : 0,
    coverage: (nonZeroCount / (grid.length * grid[0].length)) * 100
  };
}

/**
 * Find hotspots (local maxima) in the grid
 */
export function findHotspots(grid: number[][], threshold = 0.7): Position[] {
  const { max } = getGridStats(grid);
  const hotspots: Position[] = [];
  const minValue = max * threshold;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] >= minValue) {
        // Check if it's a local maximum
        let isMaximum = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
              if (grid[ny][nx] > grid[y][x]) {
                isMaximum = false;
                break;
              }
            }
          }
          if (!isMaximum) break;
        }

        if (isMaximum) {
          hotspots.push({ x, y });
        }
      }
    }
  }

  return hotspots;
}