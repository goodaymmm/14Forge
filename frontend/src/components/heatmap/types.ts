export type HeatmapType = 'position' | 'ward' | 'combat' | 'cs';

export interface Position {
  x: number;
  y: number;
}


export interface HeatmapData {
  matchId: string;
  type: HeatmapType;
  gridSize: number;
  grid: number[][];
  maxValue: number;
  minValue: number;
  metadata?: {
    participantId?: number;
    timeRange?: {
      start: number;
      end: number;
    };
    totalEvents?: number;
  };
}

export interface PositionData {
  matchId: string;
  participantId: number;
  timestamp: number;
  position: Position;
  level: number;
  currentGold: number;
  totalGold: number;
  cs: number;
}

export interface WardData {
  matchId: string;
  participantId: number;
  timestamp: number;
  position: Position;
  wardType: string;
}

export interface CombatData {
  matchId: string;
  timestamp: number;
  position: Position;
  killerId: number;
  victimId: number;
  assistingParticipantIds: number[];
  killType?: string;
}

export interface HeatmapApiResponse {
  success: boolean;
  data: {
    matchId: string;
    heatmap: number[][];
    rawPositions?: PositionData[];
    rawWards?: WardData[];
    timeline?: any[];
    positionCount?: number;
    wardCount?: number;
    killCount?: number;
  };
}

export interface HeatmapControlsState {
  type: HeatmapType;
  participantId: number | 'all';
  teamId: 'all' | '100' | '200';
  timeRange: {
    start: number;
    end: number;
  };
  showGrid: boolean;
  showLegend: boolean;
  opacity: number;
}

export interface HeatmapCanvasProps {
  data: HeatmapData;
  width: number;
  height: number;
  colorScheme?: 'viridis' | 'plasma' | 'turbo' | 'grayscale';
  showGrid?: boolean;
  opacity?: number;
  onHover?: (position: Position | null, value: number | null) => void;
  onClick?: (position: Position) => void;
}

export interface HeatmapContainerProps {
  matchId: string;
  participants?: any[];
  selectedParticipantId?: number;
  className?: string;
}

export interface HeatmapControlsProps {
  state: HeatmapControlsState;
  onChange: (state: Partial<HeatmapControlsState>) => void;
  participants?: Array<{
    participantId: number;
    championName: string;
    summonerName: string;
    teamId: number;
  }>;
}

export interface HeatmapLegendProps {
  colorScheme: 'viridis' | 'plasma' | 'turbo' | 'grayscale';
  minValue: number;
  maxValue: number;
  label?: string;
}

export interface HeatmapTooltipProps {
  position: Position | null;
  value: number | null;
  type: HeatmapType;
  visible: boolean;
}

// Map constants
export const MAP_SIZE = 16000; // Summoner's Rift size
export const GRID_SIZE = 50; // Default grid resolution

// Color schemes
export const COLOR_SCHEMES = {
  position: 'viridis',
  ward: 'turbo',
  combat: 'plasma',
  cs: 'grayscale'
} as const;

// Time constants
export const TIME_14_MIN = 840; // 14 minutes in seconds
export const TIME_INTERVAL = 60; // 1 minute intervals