import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/layout/Layout';
import { Card } from '../components/ui/card';
import FourteenCoacher from '../components/contest/FourteenCoacher';
import GlobalMetaDashboard from '../components/contest/GlobalMetaDashboard';
import AICommentaryFeed from '../components/contest/AICommentaryFeed';
import SmartAlertsPanel from '../components/contest/SmartAlertsPanel';

const ContestPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('coacher');

  const tabs = [
    {
      id: 'coacher',
      name: '14 Coacher™',
      icon: '🎯',
      description: 'AI-powered personalized coaching',
      component: FourteenCoacher
    },
    {
      id: 'meta',
      name: 'Global Meta',
      icon: '🌍',
      description: '4-region comparison dashboard',
      component: GlobalMetaDashboard
    },
    {
      id: 'commentary',
      name: 'AI Commentary',
      icon: '📢',
      description: 'Auto-generated social content',
      component: AICommentaryFeed
    },
    {
      id: 'alerts',
      name: 'Smart Alerts',
      icon: '🚨',
      description: 'Personalized notifications',
      component: SmartAlertsPanel
    }
  ];

  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;

    const Component = activeTabData.component;

    if (activeTab === 'coacher') {
      // For demo purposes, use sample data
      return (
        <FourteenCoacher
          summonerName="TestPlayer"
          region="kr"
          matchId="KR_12345"
          champion="Jinx"
          role="BOTTOM"
        />
      );
    }

    return <Component />;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                🏆 BrightData + n8n Contest 2025
              </h1>
              <p className="text-xl mb-6 max-w-3xl mx-auto">
                AI-Powered League of Legends Analytics Platform
              </p>
              <div className="flex justify-center items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span>🤖</span>
                  <span className="text-sm font-medium">n8n AI Agent</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span>🌐</span>
                  <span className="text-sm font-medium">BrightData Verified</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span>⚡</span>
                  <span className="text-sm font-medium">Real-time Analysis</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <span>🎯</span>
                  <span className="text-sm font-medium">14-Minute Analysis™</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    <div className="text-left">
                      <div>{tab.name}</div>
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderTabContent()}
        </div>

        {/* Footer Info */}
        <div className="bg-gray-900 text-white py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  14 Coacher™
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Personalized AI coaching</li>
                  <li>• High-rank benchmarks</li>
                  <li>• Real-time recommendations</li>
                  <li>• Performance scoring</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🌍</span>
                  Global Meta
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• 4-region comparison</li>
                  <li>• Statistical variance</li>
                  <li>• Emerging trends</li>
                  <li>• AI predictions</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📢</span>
                  AI Commentary
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Auto-generated content</li>
                  <li>• Multi-platform posts</li>
                  <li>• Multi-language support</li>
                  <li>• Engagement tracking</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🚨</span>
                  Smart Alerts
                </h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Personalized notifications</li>
                  <li>• Multi-source detection</li>
                  <li>• Severity filtering</li>
                  <li>• Action recommendations</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <div className="flex justify-center items-center gap-6 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span>🏗️</span>
                  <span>Built with n8n AI Agent</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>🌐</span>
                  <span>Powered by BrightData</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span>⚡</span>
                  <span>Express.js + React</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                BrightData + n8n Contest 2025 • 14Forge - AI-Powered LoL Analytics Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContestPage;