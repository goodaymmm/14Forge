import React, { useMemo } from 'react';

interface Position {
  x: number;
  y: number;
  timestamp: number;
}

interface MovementPathProps {
  positions: Position[];
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  showMarkers?: boolean;
}

export const MovementPath: React.FC<MovementPathProps> = ({
  positions,
  width,
  height,
  color = '#00ff00',
  opacity = 0.6,
  showMarkers = true
}) => {
  // Convert positions to SVG path
  const pathData = useMemo(() => {
    if (positions.length < 2) return '';
    
    // Sort positions by timestamp
    const sortedPositions = [...positions].sort((a, b) => a.timestamp - b.timestamp);
    
    // Create path string
    const path = sortedPositions.map((pos, index) => {
      // Convert game coordinates to canvas coordinates
      const canvasX = (pos.x / 16000) * width;
      const canvasY = height - ((pos.y / 16000) * height); // Flip Y axis
      
      if (index === 0) {
        return `M ${canvasX} ${canvasY}`;
      }
      return `L ${canvasX} ${canvasY}`;
    }).join(' ');
    
    return path;
  }, [positions, width, height]);
  
  const markers = useMemo(() => {
    if (!showMarkers) return [];
    
    return positions.map((pos, index) => {
      const canvasX = (pos.x / 16000) * width;
      const canvasY = height - ((pos.y / 16000) * height);
      const minute = Math.floor(pos.timestamp / 60);
      
      return {
        x: canvasX,
        y: canvasY,
        minute,
        key: `${pos.timestamp}-${index}`
      };
    });
  }, [positions, width, height, showMarkers]);
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Movement path */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeOpacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Time markers */}
      {showMarkers && markers.map(marker => (
        <g key={marker.key}>
          {/* Marker circle */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r="4"
            fill={color}
            fillOpacity={opacity + 0.2}
            stroke="white"
            strokeWidth="1"
          />
          {/* Time label */}
          <text
            x={marker.x}
            y={marker.y - 8}
            fill="white"
            fontSize="10"
            textAnchor="middle"
            className="drop-shadow-lg"
          >
            {marker.minute}m
          </text>
        </g>
      ))}
      
      {/* Start marker */}
      {positions.length > 0 && (
        <circle
          cx={(positions[0].x / 16000) * width}
          cy={height - ((positions[0].y / 16000) * height)}
          r="6"
          fill="green"
          fillOpacity="0.8"
          stroke="white"
          strokeWidth="2"
        />
      )}
      
      {/* End marker */}
      {positions.length > 1 && (
        <circle
          cx={(positions[positions.length - 1].x / 16000) * width}
          cy={height - ((positions[positions.length - 1].y / 16000) * height)}
          r="6"
          fill="red"
          fillOpacity="0.8"
          stroke="white"
          strokeWidth="2"
        />
      )}
    </svg>
  );
};