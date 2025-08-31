import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Alert {
  id: string;
  type: 'meta_change' | 'champion_buff' | 'champion_nerf' | 'trending' | 'patch';
  title: string;
  description: string;
  champion?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
  action_required: boolean;
  user_relevant: boolean;
}

interface UserPreferences {
  roles: string[];
  champions: string[];
  notification_channels: string[];
  severity_threshold: string;
}

const SmartAlertsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    roles: ['all'],
    champions: ['all'],
    notification_channels: ['web'],
    severity_threshold: 'medium'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sample alerts data
  const sampleAlerts: Alert[] = [
    {
      id: '1',
      type: 'champion_buff',
      title: 'Jinx Buffs Detected',
      description: 'AD per level increased from 3.4 to 3.6. Win rate expected to rise by 2-3%.',
      champion: 'Jinx',
      severity: 'high',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      source: 'Patch 14.15 Analysis',
      action_required: true,
      user_relevant: true
    },
    {
      id: '2',
      type: 'meta_change',
      title: 'ADC Meta Shift in Korea',
      description: 'Varus rising rapidly in KR Challenger (22.4% pick rate). Consider learning this champion.',
      champion: 'Varus',
      severity: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      source: 'BrightData KR Analysis',
      action_required: true,
      user_relevant: true
    },
    {
      id: '3',
      type: 'trending',
      title: 'New Build Path Trending',
      description: 'Caitlyn with Kraken Slayer → IE build gaining popularity on Reddit (+340% mentions).',
      champion: 'Caitlyn',
      severity: 'medium',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      source: 'Social Media Trend Detection',
      action_required: false,
      user_relevant: true
    },
    {
      id: '4',
      type: 'champion_nerf',
      title: 'Kai\'Sa Nerfs Incoming',
      description: 'PBE shows Q damage reduction. Expect 1-2% win rate drop.',
      champion: 'Kai\'Sa',
      severity: 'high',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      source: 'PBE Analysis',
      action_required: true,
      user_relevant: false
    },
    {
      id: '5',
      type: 'patch',
      title: 'Patch 14.16 Preview',
      description: 'Major bot lane changes expected. ADC item rework confirmed.',
      severity: 'critical',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      source: 'Riot Games Official',
      action_required: true,
      user_relevant: true
    }
  ];

  useEffect(() => {
    setAlerts(sampleAlerts);
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/n8n/webhook/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_type: 'all',
          user_preferences: preferences
        })
      });

      // Simulate n8n processing
      setTimeout(() => {
        setAlerts(sampleAlerts);
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-500';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-500';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'low': return 'bg-green-100 text-green-800 border-green-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'champion_buff': return '⬆️';
      case 'champion_nerf': return '⬇️';
      case 'meta_change': return '🔄';
      case 'trending': return '🔥';
      case 'patch': return '📋';
      default: return '📢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'champion_buff': return 'bg-green-100 text-green-800';
      case 'champion_nerf': return 'bg-red-100 text-red-800';
      case 'meta_change': return 'bg-blue-100 text-blue-800';
      case 'trending': return 'bg-orange-100 text-orange-800';
      case 'patch': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredAlerts = alerts.filter(alert => {
    // Filter by severity threshold
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = severityOrder[preferences.severity_threshold as keyof typeof severityOrder] || 2;
    const alertLevel = severityOrder[alert.severity as keyof typeof severityOrder] || 1;
    
    return alertLevel >= thresholdLevel && alert.user_relevant;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              🚨
            </div>
            <div>
              <h2 className="text-xl font-bold">Smart Alerts System</h2>
              <p className="text-gray-600 text-sm">
                Personalized notifications from multiple sources
              </p>
            </div>
          </div>
          
          <Button 
            onClick={fetchAlerts}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                Refresh Alerts
              </>
            )}
          </Button>
        </div>

        {/* Preferences Quick Settings */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">Alert Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity Threshold
              </label>
              <select 
                value={preferences.severity_threshold}
                onChange={(e) => setPreferences(prev => ({...prev, severity_threshold: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="low">Low & Above</option>
                <option value="medium">Medium & Above</option>
                <option value="high">High & Above</option>
                <option value="critical">Critical Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Focus Role
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="all">All Roles</option>
                <option value="adc">ADC Only</option>
                <option value="mid">Mid Lane</option>
                <option value="jungle">Jungle</option>
                <option value="support">Support</option>
                <option value="top">Top Lane</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Channel
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="web">Web Only</option>
                <option value="discord">Discord</option>
                <option value="email">Email</option>
                <option value="all">All Channels</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert Count Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.severity === 'critical').length}
            </div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {alerts.filter(a => a.severity === 'high').length}
            </div>
            <div className="text-sm text-orange-700">High</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.severity === 'medium').length}
            </div>
            <div className="text-sm text-yellow-700">Medium</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.severity === 'low').length}
            </div>
            <div className="text-sm text-green-700">Low</div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <Card key={alert.id} className={`p-4 border-l-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg">{getTypeIcon(alert.type)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(alert.type)}`}>
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.champion && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {alert.champion}
                      </span>
                    )}
                    {alert.action_required && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        ACTION REQUIRED
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{alert.title}</h3>
                  <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📍 {alert.source}</span>
                    <span>🕐 {formatTimeAgo(alert.timestamp)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {alert.action_required && (
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs">
                      Take Action
                    </Button>
                  )}
                  <button className="text-xs text-gray-500 hover:text-gray-700">
                    Dismiss
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🚨</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts match your preferences</h3>
            <p className="text-gray-500 mb-4">Adjust your severity threshold or refresh to see more alerts</p>
            <Button onClick={fetchAlerts} className="bg-red-600 hover:bg-red-700">
              <span className="mr-2">🔄</span>
              Check for Alerts
            </Button>
          </div>
        )}

        {/* Source Attribution */}
        <div className="flex justify-center mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-full text-sm">
            <span>🎯</span>
            <span>Powered by Multi-Source Intelligence</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SmartAlertsPanel;