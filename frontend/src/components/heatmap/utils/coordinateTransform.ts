/**
 * Coordinate transformation utilities for Riot API to image mapping
 */

// Actual playable area is approximately 14870x14980
// with padding on all sides
const RIOT_MAP_MIN = 570;   // Minimum playable coordinate
const RIOT_MAP_MAX = 14870; // Maximum playable coordinate
const RIOT_MAP_RANGE = RIOT_MAP_MAX - RIOT_MAP_MIN;

/**
 * Convert Riot API coordinates to image pixel coordinates
 * Riot API: Origin (0,0) is bottom-left, max (16000,16000) is top-right
 * Image: Origin (0,0) is top-left
 * Note: The actual playable area is roughly 570-14870 on both axes
 */
export function riotToImageCoords(
  riotX: number,
  riotY: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  // Normalize coordinates to 0-1 range based on actual playable area
  const normalizedX = (riotX - RIOT_MAP_MIN) / RIOT_MAP_RANGE;
  const normalizedY = (riotY - RIOT_MAP_MIN) / RIOT_MAP_RANGE;
  
  // Clamp to 0-1 range
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const clampedY = Math.max(0, Math.min(1, normalizedY));
  
  return {
    x: clampedX * imageWidth,
    // Flip Y axis since Riot uses bottom-left origin and image uses top-left
    y: imageHeight - (clampedY * imageHeight)
  };
}

/**
 * Convert image pixel coordinates to Riot API coordinates
 */
export function imageToRiotCoords(
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  // Convert pixel coordinates to normalized 0-1 range
  const normalizedX = imageX / imageWidth;
  const normalizedY = (imageHeight - imageY) / imageHeight; // Flip Y axis
  
  // Map to actual playable area
  return {
    x: RIOT_MAP_MIN + (normalizedX * RIOT_MAP_RANGE),
    y: RIOT_MAP_MIN + (normalizedY * RIOT_MAP_RANGE)
  };
}

/**
 * Convert grid coordinates to image pixel coordinates
 */
export function gridToImageCoords(
  gridX: number,
  gridY: number,
  gridSize: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  const cellWidth = imageWidth / gridSize;
  const cellHeight = imageHeight / gridSize;
  
  return {
    x: gridX * cellWidth + cellWidth / 2,
    y: gridY * cellHeight + cellHeight / 2
  };
}

/**
 * Apply Gaussian blur to heatmap data for smoother visualization
 */
export function applyGaussianBlur(
  grid: number[][],
  radius: number = 1
): number[][] {
  const size = grid.length;
  const blurred: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  
  // Simple box blur approximation of Gaussian
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      let count = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          
          if (ny >= 0 && ny < size && nx >= 0 && nx < size) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const weight = Math.exp(-(distance * distance) / (2 * radius * radius));
            sum += grid[ny][nx] * weight;
            count += weight;
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
export function normalizeGrid(grid: number[][]): number[][] {
  let max = 0;
  
  for (const row of grid) {
    for (const value of row) {
      if (value > max) max = value;
    }
  }
  
  if (max === 0) return grid;
  
  return grid.map(row => row.map(value => value / max));
}