import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface WardEvent {
  position: { x: number; y: number };
  timestamp: number;
  wardType: string;
  participantId: number;
}

interface WardMarkersProps {
  wards: WardEvent[];
  width: number;
  height: number;
  participants?: Array<{ participantId: number; summonerName: string; teamId: number }>;
}

export const WardMarkers: React.FC<WardMarkersProps> = ({
  wards,
  width,
  height,
  participants = []
}) => {
  const [hoveredWard, setHoveredWard] = useState<number | null>(null);
  
  // Convert ward positions to canvas coordinates
  const wardMarkers = wards.map((ward, index) => {
    // Actual playable area boundaries
    const MAP_MIN = 570;
    const MAP_MAX = 14870;
    const MAP_RANGE = MAP_MAX - MAP_MIN;
    
    // Normalize position to 0-1 range based on actual playable area
    const normalizedX = (ward.position.x - MAP_MIN) / MAP_RANGE;
    const normalizedY = (ward.position.y - MAP_MIN) / MAP_RANGE;
    
    // Clamp to 0-1 range
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    
    // Convert to canvas coordinates
    const canvasX = clampedX * width;
    const canvasY = height - (clampedY * height); // Flip Y axis
    
    // Get participant info
    const participant = participants.find(p => p.participantId === ward.participantId);
    const isBlueTeam = participant?.teamId === 100;
    
    // Format time
    const minutes = Math.floor(ward.timestamp / 60);
    const seconds = ward.timestamp % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return {
      x: canvasX,
      y: canvasY,
      type: ward.wardType,
      time: timeStr,
      participantName: participant?.summonerName || `Player ${ward.participantId}`,
      isBlueTeam,
      key: `ward-${index}-${ward.timestamp}`
    };
  });
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 11 }}
    >
      {wardMarkers.map((marker, index) => {
        const isHovered = hoveredWard === index;
        const iconSize = isHovered ? 20 : 16;
        const halfSize = iconSize / 2;
        
        // Determine ward color based on type and team
        let wardColor = marker.isBlueTeam ? '#3B82F6' : '#EF4444'; // Blue or Red team
        if (marker.type === 'CONTROL_WARD') {
          wardColor = '#A855F7'; // Purple for control wards
        } else if (marker.type === 'WARD_KILL') {
          wardColor = '#6B7280'; // Gray for killed wards
        }
        
        return (
          <g 
            key={marker.key}
            onMouseEnter={() => setHoveredWard(index)}
            onMouseLeave={() => setHoveredWard(null)}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
          >
            {/* Ward icon background */}
            <circle
              cx={marker.x}
              cy={marker.y}
              r={halfSize + 2}
              fill="rgba(0, 0, 0, 0.5)"
            />
            
            {/* Ward icon */}
            {marker.type === 'WARD_KILL' ? (
              <g transform={`translate(${marker.x - halfSize}, ${marker.y - halfSize})`}>
                <EyeOff 
                  size={iconSize}
                  color={wardColor}
                  strokeWidth={2}
                />
              </g>
            ) : (
              <g transform={`translate(${marker.x - halfSize}, ${marker.y - halfSize})`}>
                <Eye 
                  size={iconSize}
                  color={wardColor}
                  strokeWidth={2}
                />
              </g>
            )}
            
            {/* Tooltip on hover */}
            {isHovered && (
              <g>
                <rect
                  x={marker.x - 60}
                  y={marker.y - 45}
                  width="120"
                  height="30"
                  fill="rgba(0, 0, 0, 0.9)"
                  rx="4"
                  stroke="white"
                  strokeWidth="1"
                />
                <text
                  x={marker.x}
                  y={marker.y - 30}
                  fill="white"
                  fontSize="11"
                  textAnchor="middle"
                  className="font-medium"
                >
                  {marker.participantName}
                </text>
                <text
                  x={marker.x}
                  y={marker.y - 18}
                  fill="#9CA3AF"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {marker.type.replace('_', ' ')} • {marker.time}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};