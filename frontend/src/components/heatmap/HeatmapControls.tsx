import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeatmapControlsProps, HeatmapType } from './types';
import { Button } from '../ui/button';
import { 
  Map, 
  Eye, 
  Swords, 
  Coins,
  Users,
  User,
  Clock,
  Layers
} from 'lucide-react';


export const HeatmapControls: React.FC<HeatmapControlsProps> = ({
  state,
  onChange,
  participants = []
}) => {
  const { t } = useTranslation();

  const heatmapTypes: { value: HeatmapType; label: string; icon: React.ReactNode }[] = [
    { value: 'position', label: t('heatmap.movement'), icon: <Map className="w-4 h-4" /> },
    { value: 'combat', label: t('heatmap.combatActivity'), icon: <Swords className="w-4 h-4" /> }
  ];
  // Group participants by team
  const team1 = participants.filter(p => p.teamId === 100);
  const team2 = participants.filter(p => p.teamId === 200);

  return (
    <div className="space-y-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
      {/* Heatmap Type Selection */}
      <div>
        <label className="text-sm font-medium text-gray-400 mb-2 block">
          {t('heatmap.controls.type')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {heatmapTypes.map(type => (
            <Button
              key={type.value}
              variant={state.type === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange({ type: type.value })}
              className="justify-start"
            >
              {type.icon}
              <span className="ml-2">{type.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Participant Filter */}
      <div>
        <label className="text-sm font-medium text-gray-400 mb-2 block">
          <User className="inline w-4 h-4 mr-1" />
          {t('heatmap.controls.participant')}
        </label>
        <select
          value={state.participantId}
          onChange={(e) => onChange({ participantId: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white"
        >
          <option value="all">{t('heatmap.controls.allParticipants')}</option>
          {team1.length > 0 && (
            <optgroup label={t('heatmap.controls.blueTeam')}>
              {team1.map(p => (
                <option key={p.participantId} value={p.participantId}>
                  {p.summonerName} ({p.championName})
                </option>
              ))}
            </optgroup>
          )}
          {team2.length > 0 && (
            <optgroup label={t('heatmap.controls.redTeam')}>
              {team2.map(p => (
                <option key={p.participantId} value={p.participantId}>
                  {p.summonerName} ({p.championName})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>


      {/* Display Options */}
      <div>
        <label className="text-sm font-medium text-gray-400 mb-2 block">
          {t('heatmap.controls.title')}
        </label>
      </div>

      {/* Time Range Selection */}
      <div className="pt-4 border-t border-gray-800">
        <label className="text-sm font-medium text-gray-400 mb-2 block">
          <Clock className="inline w-4 h-4 mr-1" />
          {t('heatmap.controls.timeRange')}
        </label>
        
        {/* Quick Range Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            variant={state.timeRange.start === 0 && state.timeRange.end === 300 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({
              timeRange: { start: 0, end: 300 }
            })}
            className={state.timeRange.start === 0 && state.timeRange.end === 300 ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            0-5分
          </Button>
          <Button
            variant={state.timeRange.start === 300 && state.timeRange.end === 600 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({
              timeRange: { start: 300, end: 600 }
            })}
            className={state.timeRange.start === 300 && state.timeRange.end === 600 ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            5-10分
          </Button>
          <Button
            variant={state.timeRange.start === 600 && state.timeRange.end === 840 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({
              timeRange: { start: 600, end: 840 }
            })}
            className={state.timeRange.start === 600 && state.timeRange.end === 840 ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            10-14分
          </Button>
          <Button
            variant={state.timeRange.start === 0 && state.timeRange.end === 840 ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({
              timeRange: { start: 0, end: 840 }
            })}
            className={state.timeRange.start === 0 && state.timeRange.end === 840 ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            全体
          </Button>
        </div>
        
        {/* 1-Minute Interval Buttons */}
        <div className="pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">1分単位</p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }, (_, i) => {
              const start = i * 60;
              const end = (i + 1) * 60;
              return (
                <Button
                  key={i}
                  variant={state.timeRange.start === start && state.timeRange.end === end ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange({
                    timeRange: { start, end }
                  })}
                  className={`text-xs px-1 ${
                    state.timeRange.start === start && state.timeRange.end === end 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : ''
                  }`}
                >
                  {i}-{i + 1}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}