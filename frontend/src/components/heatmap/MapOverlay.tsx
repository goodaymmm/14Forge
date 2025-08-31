import React from 'react';

interface MapOverlayProps {
  width: number;
  height: number;
  children?: React.ReactNode;
}

export const MapOverlay: React.FC<MapOverlayProps> = ({ width, height, children }) => {
  return (
    <div 
      className="relative inline-block"
      style={{ width, height }}
    >
      {/* Summoner's Rift background image */}
      <img
        src="/images/summoners-rift.jpg"
        alt="Summoner's Rift"
        className="absolute inset-0 w-full h-full object-cover rounded"
        style={{ width, height }}
      />
      
      {/* Overlay content (heatmap canvas, markers, etc.) */}
      <div className="absolute inset-0">
        {children}
      </div>
      
    </div>
  );
};