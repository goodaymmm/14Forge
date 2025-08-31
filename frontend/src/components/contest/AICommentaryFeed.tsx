import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

interface Commentary {
  id: string;
  matchId: string;
  platforms: {
    twitter: string;
    discord: string;
    japanese: string;
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  timestamp: string;
  match_info: {
    duration: string;
    score: string;
    mvp_player: string;
  };
}

const AICommentaryFeed: React.FC = () => {
  const { t } = useTranslation();
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sample data for demo
  const sampleCommentaries: Commentary[] = [
    {
      id: '1',
      matchId: 'KR_6969420',
      platforms: {
        twitter: '🔥 INSANE 25-min game! Jinx carried with 15/3/8 KDA - that Baron steal at 22:15 changed everything! #LoL #ADCDiff #LeagueOfLegends',
        discord: '**MATCH HIGHLIGHTS** 🎯\n\n**Duration:** 25:34\n**Score:** 18-12\n**MVP:** Jinx (15/3/8)\n\n**Key Moments:**\n• First Blood at 3:24 ⚔️\n• Baron stolen at 22:15 🐉\n• Game-ending teamfight at 24:50 💥\n\n*What a performance! This is why positioning matters in late game.*',
        japanese: '🎌 25分の激戦！JinxのKDA 15/3/8でMVP獲得！22分15秒のバロンスティールが試合を決めた！ #LoL #日本鯖 #ADC'
      },
      engagement: { likes: 127, shares: 23, comments: 15 },
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      match_info: {
        duration: '25:34',
        score: '18-12',
        mvp_player: 'Jinx'
      }
    },
    {
      id: '2',
      matchId: 'NA1_4206969',
      platforms: {
        twitter: '🚀 Yasuo pentakill at 28 minutes! The 0/10 powerspike is real! From feeding to hero in one teamfight ⚔️ #LoL #Pentakill #NeverGiveUp',
        discord: '**COMEBACK STORY OF THE DAY** 💪\n\n**Champion:** Yasuo\n**Score:** 0/10 → 5/10 (Pentakill)\n**Time:** 28:15\n\n*Remember: It\'s not about how you start, it\'s about how you finish! This Yasuo just proved that one good teamfight can change everything.*',
        japanese: '⚡ ヤスオのペンタキル！28分で0/10から逆転劇！諦めなければ勝機はある！ #LoL #ペンタキル #逆転'
      },
      engagement: { likes: 89, shares: 34, comments: 22 },
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      match_info: {
        duration: '32:18',
        score: '22-19',
        mvp_player: 'Yasuo'
      }
    },
    {
      id: '3',
      matchId: 'EUW1_1337420',
      platforms: {
        twitter: '🧠 200 IQ support play! Thresh hook into lantern save at Dragon pit secured the game! Support diff is real 🪝 #LoL #SupportLife #BigBrain',
        discord: '**SUPPORT MASTERCLASS** 🎭\n\n**Champion:** Thresh\n**Play:** Hook → Lantern Save → Dragon Secure\n**Impact:** Game-winning\n\n*This is why support is the most underrated role. One good play can carry the entire team to victory!*',
        japanese: '🎣 スレッシュの神プレイ！ドラゴンピットでのフック→ランタン救出が試合を決めた！サポートの差が勝敗を分けた！ #LoL #サポート'
      },
      engagement: { likes: 156, shares: 41, comments: 28 },
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      match_info: {
        duration: '28:45',
        score: '15-13',
        mvp_player: 'Thresh'
      }
    }
  ];

  useEffect(() => {
    setCommentaries(sampleCommentaries);
  }, []);

  const generateCommentary = async () => {
    setIsGenerating(true);

    // Simulate API call to n8n workflow
    try {
      const response = await fetch('/api/n8n/webhook/commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: 'DEMO_' + Date.now(),
          duration: '29:42',
          team1_score: '16',
          team2_score: '11',
          mvp_player: 'Akali',
          mvp_kda: '12/2/7',
          key_events: [
            'Solo kill at 6:30',
            'Triple kill at 18:45',
            'Game-ending assassination at 29:20'
          ],
          language: 'en'
        })
      });

      // Simulate n8n processing time
      setTimeout(() => {
        const newCommentary: Commentary = {
          id: Date.now().toString(),
          matchId: 'DEMO_' + Date.now(),
          platforms: {
            twitter: '⚡ Akali ASSASSINATED the enemy team! 12/2/7 KDA with a game-ending pick at 29:20! The ninja difference! 🥷 #LoL #Akali #Assassin',
            discord: '**ASSASSINATION COMPLETE** 🥷\n\n**Champion:** Akali\n**KDA:** 12/2/7\n**Duration:** 29:42\n\n**Highlights:**\n• Solo kill at 6:30 🗡️\n• Triple kill at 18:45 🔥\n• Game-ending pick at 29:20 💀\n\n*When Akali gets ahead, there\'s no stopping her!*',
            japanese: '🥷 アカリの暗殺ショー！KDA 12/2/7で29分20秒にゲームエンド！忍者の力を見せつけた！ #LoL #アカリ #暗殺者'
          },
          engagement: { likes: 0, shares: 0, comments: 0 },
          timestamp: new Date().toISOString(),
          match_info: {
            duration: '29:42',
            score: '16-11',
            mvp_player: 'Akali'
          }
        };

        setCommentaries(prev => [newCommentary, ...prev]);
        setIsGenerating(false);
      }, 3000);

    } catch (error) {
      console.error('Failed to generate commentary:', error);
      setIsGenerating(false);
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

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return '🐦';
      case 'discord': return '💬';
      case 'japanese': return '🎌';
      default: return '📱';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'discord': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'japanese': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            📢
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Commentary Feed</h2>
            <p className="text-gray-600 text-sm">
              Auto-generated match highlights for social media
            </p>
          </div>
        </div>
        
        <Button 
          onClick={generateCommentary}
          disabled={isGenerating}
          className="bg-green-600 hover:bg-green-700"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <span className="mr-2">🤖</span>
              Generate New
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {commentaries.map((commentary) => (
          <Card key={commentary.id} className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="font-medium">Match {commentary.matchId}</div>
                <div className="text-sm text-gray-500">
                  {commentary.match_info.duration} • {commentary.match_info.score} • MVP: {commentary.match_info.mvp_player}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {formatTimeAgo(commentary.timestamp)}
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(commentary.platforms).map(([platform, content]) => (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPlatformIcon(platform)}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPlatformColor(platform)}`}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 ml-6">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <span>❤️</span>
                  <span>{commentary.engagement.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🔄</span>
                  <span>{commentary.engagement.shares}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💬</span>
                  <span>{commentary.engagement.comments}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                  Post to Twitter
                </button>
                <button className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors">
                  Send to Discord
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {commentaries.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📢</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No commentaries yet</h3>
          <p className="text-gray-500 mb-4">Generate your first AI-powered match commentary</p>
          <Button onClick={generateCommentary} className="bg-green-600 hover:bg-green-700">
            <span className="mr-2">🤖</span>
            Generate Commentary
          </Button>
        </div>
      )}

      <div className="flex justify-center mt-6 pt-4 border-t">
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-full text-sm">
          <span>🚀</span>
          <span>Powered by n8n AI Agent + Social Media APIs</span>
        </div>
      </div>
    </Card>
  );
};

export default AICommentaryFeed;