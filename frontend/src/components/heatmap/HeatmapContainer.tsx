import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { HeatmapCanvas } from './HeatmapCanvas';
import { HeatmapControls } from './HeatmapControls';
import { HeatmapLegend } from './HeatmapLegend';
import { MapOverlay } from './MapOverlay';
import { WardMarkers } from './WardMarkers';
import { MovementPath } from './MovementPath';
import { HeatmapContainerProps, HeatmapControlsState, Position, COLOR_SCHEMES } from './types';
import { useHeatmapData, useHeatmapStats } from './hooks/useHeatmapData';
import LoadingSpinner from '../common/LoadingSpinner';
import { Button } from '../ui/button';
import { AlertCircle, TrendingUp, Activity } from 'lucide-react';

export const HeatmapContainer: React.FC<HeatmapContainerProps> = ({
  matchId,
  participants,
  selectedParticipantId,
  className = ''
}) => {
  const { t } = useTranslation();
  const [shouldFetch, setShouldFetch] = useState(false);
  
  // Debug log
  console.log('[HeatmapContainer] Props received:', {
    matchId,
    participantsCount: participants?.length,
    selectedParticipantId,
    selectedParticipantIdType: typeof selectedParticipantId
  });
  
  // Initialize with selected participant if provided
  const [controlsState, setControlsState] = useState<HeatmapControlsState>({
    type: 'position',
    participantId: selectedParticipantId !== undefined ? selectedParticipantId : 'all',
    teamId: 'all',
    timeRange: { start: 0, end: 840 },
    showGrid: false,
    showLegend: true,
    opacity: 0.8
  });

  const [hoveredPosition, setHoveredPosition] = useState<{
    position: Position | null;
    value: number | null;
  }>({ position: null, value: null });

  // Fetch heatmap data only when shouldFetch is true
  const { data: heatmapData, isLoading, error } = useHeatmapData({
    matchId,
    type: controlsState.type,
    participantId: controlsState.participantId,
    teamId: controlsState.teamId,
    startTime: controlsState.timeRange.start,
    endTime: controlsState.timeRange.end,
    enabled: shouldFetch
  });
  
  // Fetch ward data when viewing ward heatmap
  const { data: wardData } = useHeatmapData({
    matchId,
    type: 'ward',
    participantId: controlsState.participantId,
    teamId: controlsState.teamId,
    startTime: controlsState.timeRange.start,
    endTime: controlsState.timeRange.end,
    enabled: shouldFetch && controlsState.type === 'ward'
  });

  // Fetch stats
  const { data: stats } = useHeatmapStats(matchId);

  // Get color scheme based on heatmap type
  const colorScheme = useMemo(() => {
    return COLOR_SCHEMES[controlsState.type] as any;
  }, [controlsState.type]);

  const handleControlsChange = (updates: Partial<HeatmapControlsState>) => {
    setControlsState(prev => ({ ...prev, ...updates }));
  };

  const handleHover = (position: Position | null, value: number | null) => {
    setHoveredPosition({ position, value });
  };

  const handleClick = (position: Position) => {
    console.log('Clicked position:', position);
    // Could open a detailed view or analysis for this position
  };

  if (error) {
    console.error('[HeatmapContainer] Error:', error);
    return (
      <div className="flex items-center justify-center p-8 rounded-lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">{t('heatmap.error')}</p>
          <p className="text-sm text-gray-600 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Show generate button if not yet fetched
  if (!shouldFetch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">{t('heatmap.description')}</p>
        <Button 
          onClick={() => {
            console.log('[Heatmap] Generate button clicked for match:', matchId);
            setShouldFetch(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {t('heatmap.generateButton')}
        </Button>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 ${className}`}>
      {/* Controls Panel */}
      <div className="space-y-4">
        <HeatmapControls
          state={controlsState}
          onChange={handleControlsChange}
          participants={participants || []}
        />
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Heatmap Display */}
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 min-h-[800px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {getHeatmapTitle(controlsState.type, t)}
            </h2>
            {heatmapData && (
              <div className="text-sm text-gray-400">
                {t('heatmap.eventsTracked', { count: heatmapData.metadata?.totalEvents || 0 })}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <LoadingSpinner />
            </div>
          ) : heatmapData ? (
            heatmapData.grid && heatmapData.grid.flat().some(v => v > 0) ? (
            <div className="flex gap-6">
              <div className="flex-1">
                <MapOverlay width={600} height={600}>
                  <HeatmapCanvas
                    data={heatmapData}
                    width={600}
                    height={600}
                    colorScheme={colorScheme}
                    showGrid={controlsState.showGrid}
                    opacity={controlsState.opacity}
                    onHover={handleHover}
                    onClick={handleClick}
                  />
                  {/* Ward markers overlay */}
                  {controlsState.type === 'ward' && wardData?.metadata && (
                    <WardMarkers
                      wards={(wardData as any).rawWards || []}
                      width={600}
                      height={600}
                      participants={participants}
                    />
                  )}
                </MapOverlay>
                
                {/* Hover Info */}
                {hoveredPosition.position && hoveredPosition.value !== null && (
                  <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{t('common.position', 'Position')}:</span>
                      <span className="text-white">
                        ({hoveredPosition.position.x}, {hoveredPosition.position.y})
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-400">{t('heatmap.legend.density')}:</span>
                      <span className="text-white">{hoveredPosition.value}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-400">{t('heatmap.noDataAvailable', 'No position data available for this match')}</p>
                <p className="text-sm text-gray-600 mt-2">{t('heatmap.tryDifferentSettings', 'Try adjusting the time range or participant filter')}</p>
              </div>
            </div>
          )) : null}
        </div>

      </div>
    </div>
  );
};

function getHeatmapTitle(type: string, t: any): string {
  switch (type) {
    case 'position': return t('heatmap.movement');
    case 'ward': return t('heatmap.visionControl');
    case 'combat': return t('heatmap.combatActivity');
    case 'cs': return t('heatmap.csFarming');
    default: return t('heatmap.title');
  }
}

function getLegendLabel(type: string, t: any): string {
  switch (type) {
    case 'position': return t('heatmap.legend.movementDensity');
    case 'ward': return t('heatmap.legend.wardFrequency');
    case 'combat': return t('heatmap.legend.killDensity');
    case 'cs': return t('heatmap.legend.csDensity');
    default: return t('heatmap.legend.activityLevel');
  }
}

function getInsights(type: string, t: any): string[] {
  switch (type) {
    case 'position':
      return [
        t('heatmap.insights.movement.1'),
        t('heatmap.insights.movement.2'),
        t('heatmap.insights.movement.3')
      ];
    case 'ward':
      return [
        t('heatmap.insights.ward.1'),
        t('heatmap.insights.ward.2'),
        t('heatmap.insights.ward.3')
      ];
    case 'combat':
      return [
        t('heatmap.insights.combat.1'),
        t('heatmap.insights.combat.2'),
        t('heatmap.insights.combat.3')
      ];
    case 'cs':
      return [
        t('heatmap.insights.cs.1'),
        t('heatmap.insights.cs.2'),
        t('heatmap.insights.cs.3')
      ];
    default:
      return [];
  }
}