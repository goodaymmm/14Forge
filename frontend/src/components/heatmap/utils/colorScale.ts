import * as d3 from 'd3';

export type ColorScheme = 'viridis' | 'plasma' | 'turbo' | 'grayscale';

/**
 * Get D3 color interpolator based on scheme name
 */
export function getColorInterpolator(scheme: ColorScheme) {
  switch (scheme) {
    case 'viridis':
      return d3.interpolateViridis;
    case 'plasma':
      return d3.interpolatePlasma;
    case 'turbo':
      return d3.interpolateTurbo;
    case 'grayscale':
      return (t: number) => d3.interpolateGreys(1 - t); // Reverse for dark = high density
    default:
      return d3.interpolateViridis;
  }
}

/**
 * Create a color scale for heatmap values
 */
export function createColorScale(
  minValue: number,
  maxValue: number,
  scheme: ColorScheme = 'viridis'
) {
  const interpolator = getColorInterpolator(scheme);
  
  return d3.scaleSequential()
    .domain([minValue, maxValue])
    .interpolator(interpolator);
}

/**
 * Convert grid value to RGB color
 */
export function valueToColor(
  value: number,
  minValue: number,
  maxValue: number,
  scheme: ColorScheme = 'viridis'
): string {
  if (value === 0) return 'transparent';
  
  const scale = createColorScale(minValue, maxValue, scheme);
  return scale(value);
}

/**
 * Generate legend gradient stops
 */
export function generateLegendGradient(scheme: ColorScheme, steps = 10): string[] {
  const interpolator = getColorInterpolator(scheme);
  const colors: string[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    colors.push(interpolator(t));
  }
  
  return colors;
}

/**
 * Create CSS gradient string for legend
 */
export function createGradientCSS(scheme: ColorScheme): string {
  const colors = generateLegendGradient(scheme, 20);
  const stops = colors.map((color, i) => `${color} ${(i / (colors.length - 1)) * 100}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * Get contrasting text color for background
 */
export function getContrastColor(backgroundColor: string): string {
  // Convert to RGB
  const color = d3.color(backgroundColor);
  if (!color) return '#000000';
  
  const rgb = color.rgb();
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}