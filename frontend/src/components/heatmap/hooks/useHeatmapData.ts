import { useQuery } from '@tanstack/react-query';
import { HeatmapType, HeatmapApiResponse, HeatmapData } from '../types';

interface UseHeatmapDataOptions {
  matchId: string;
  type: HeatmapType;
  participantId?: number | 'all';
  teamId?: 'all' | '100' | '200';
  startTime?: number;
  endTime?: number;
  enabled?: boolean;
}

export function useHeatmapData({
  matchId,
  type,
  participantId = 'all',
  teamId = 'all',
  startTime = 0,
  endTime = 840,
  enabled = true
}: UseHeatmapDataOptions) {
  return useQuery({
    queryKey: ['heatmap', matchId, type, participantId, teamId, startTime, endTime],
    queryFn: async (): Promise<HeatmapData> => {
      // Determine endpoint based on type
      let endpoint = '';
      switch (type) {
        case 'position':
          endpoint = 'positions';
          break;
        case 'ward':
          endpoint = 'wards';
          break;
        case 'combat':
          endpoint = 'combat';
          break;
        case 'cs':
          endpoint = 'positions'; // CS uses position data with filtering
          break;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (participantId !== 'all') {
        params.append('participantId', participantId.toString());
      }
      if (teamId !== 'all') {
        params.append('teamId', teamId);
      }
      params.append('startTime', startTime.toString());
      params.append('endTime', endTime.toString());

      // Use fetch with proper base URL
      const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
      const url = `${baseUrl}/api/heatmap/${matchId}/${endpoint}?${params.toString()}`;
      
      console.log('[Heatmap] Fetching with params:', {
        matchId,
        endpoint,
        participantId,
        teamId,
        startTime,
        endTime,
        fullUrl: url
      });
      
      const response = await fetch(url);
      const data = await response.json() as HeatmapApiResponse;
      
      console.log('[Heatmap] Response received:', {
        status: response.status,
        success: data.success,
        hasHeatmap: !!data.data?.heatmap,
        heatmapSize: data.data?.heatmap?.length,
        positionCount: data.data?.positionCount,
        error: data.error
      });
      
      // Log the full response for debugging
      console.log('[Heatmap] Full response data:', JSON.stringify(data, null, 2));
      
      // Log the actual heatmap grid if it exists
      if (data.data?.heatmap) {
        const nonZeroCount = data.data.heatmap.flat().filter((v: number) => v > 0).length;
        console.log('[Heatmap] Grid analysis:', {
          totalCells: data.data.heatmap.length * (data.data.heatmap[0]?.length || 0),
          nonZeroCells: nonZeroCount,
          hasData: nonZeroCount > 0
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error?.message || 'Failed to fetch heatmap'}`);
      }

      if (!data.success) {
        throw new Error('Failed to fetch heatmap data');
      }

      // Transform API response to HeatmapData
      const grid = data.data.heatmap;
      const gridSize = grid.length;
      
      // Calculate min/max values
      let minValue = Infinity;
      let maxValue = -Infinity;
      for (const row of grid) {
        for (const value of row) {
          if (value > 0) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
          }
        }
      }

      if (minValue === Infinity) {
        minValue = 0;
        maxValue = 0;
      }

      return {
        matchId,
        type,
        gridSize,
        grid,
        minValue,
        maxValue,
        metadata: {
          participantId: participantId === 'all' ? undefined : participantId,
          timeRange: { start: startTime, end: endTime },
          totalEvents: data.data.positionCount || 
                      data.data.wardCount || 
                      data.data.killCount || 0
        }
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

export function useGenerateHeatmap(matchId: string) {
  return useQuery({
    queryKey: ['heatmap-generate', matchId],
    queryFn: async () => {
      const response = await axios.post(`/api/heatmap/${matchId}/generate`);
      return response.data;
    },
    enabled: false, // Manual trigger
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

export function useHeatmapStats(matchId: string) {
  return useQuery({
    queryKey: ['heatmap-stats', matchId],
    queryFn: async () => {
      const baseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/heatmap/${matchId}/stats`);
      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000
  });
}