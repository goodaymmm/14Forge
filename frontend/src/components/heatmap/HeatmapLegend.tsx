import React from 'react';
import { HeatmapLegendProps } from './types';
import { createGradientCSS } from './utils/colorScale';

export const HeatmapLegend: React.FC<HeatmapLegendProps> = ({
  colorScheme,
  minValue,
  maxValue,
  label = 'Density'
}) => {
  const gradient = createGradientCSS(colorScheme);

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-sm font-medium text-gray-400 mb-3">{label}</h3>
      
      <div className="space-y-2">
        {/* Gradient bar */}
        <div className="relative h-8 rounded overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{ background: gradient }}
          />
        </div>
        
        {/* Value labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{minValue > 0 ? minValue.toFixed(0) : 'Low'}</span>
          <span>{((minValue + maxValue) / 2).toFixed(0)}</span>
          <span>{maxValue.toFixed(0)} {maxValue > 0 ? '(High)' : ''}</span>
        </div>
        
        {/* Description based on color scheme */}
        <div className="text-xs text-gray-600 mt-2">
          {getSchemeDescription(colorScheme)}
        </div>
      </div>
    </div>
  );
};

function getSchemeDescription(scheme: string): string {
  switch (scheme) {
    case 'viridis':
      return 'Player movement density - Brighter areas indicate frequent presence';
    case 'plasma':
      return 'Combat intensity - Hot spots show areas of frequent fights';
    case 'turbo':
      return 'Vision control - Highlights common ward placement locations';
    case 'grayscale':
      return 'CS farming patterns - Darker areas show minion clearing zones';
    default:
      return 'Activity density across the map';
  }
}