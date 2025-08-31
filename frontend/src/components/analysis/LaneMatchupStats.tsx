import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LaneMatchupStatsProps {
  participants: any[]
  gameVersion?: string
}

interface MatchupData {
  champion1: string
  champion2: string
  winRate: number
  games: number
  advantage: 'champion1' | 'champion2' | 'even'
  laneKillRate: number
  csDifferential: number
}

const LaneMatchupStats = ({ participants, gameVersion }: LaneMatchupStatsProps) => {
  const { t } = useTranslation()
  const [matchups, setMatchups] = useState<Record<string, MatchupData>>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Group participants by lane
    const lanes = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
    const laneMatchups: Record<string, MatchupData> = {}
    
    lanes.forEach(lane => {
      const lanePlayers = participants.filter(p => p.individualPosition === lane)
      if (lanePlayers.length === 2) {
        const [player1, player2] = lanePlayers
        
        // Mock data - in production, this would fetch from an API or database
        const mockWinRate = generateMockWinRate(player1.championName, player2.championName)
        
        laneMatchups[lane] = {
          champion1: player1.championName,
          champion2: player2.championName,
          winRate: mockWinRate,
          games: Math.floor(Math.random() * 50000) + 10000,
          advantage: mockWinRate > 52 ? 'champion1' : mockWinRate < 48 ? 'champion2' : 'even',
          laneKillRate: Math.random() * 0.3 + 0.1,
          csDifferential: (Math.random() - 0.5) * 20
        }
      }
    })
    
    setMatchups(laneMatchups)
    setLoading(false)
  }, [participants])
  
  const generateMockWinRate = (champ1: string, champ2: string): number => {
    // Simplified mock win rate generation based on champion names
    // In production, this would be real data from an API
    const seed = (champ1 + champ2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return 45 + (seed % 10)
  }
  
  const getAdvantageColor = (advantage: string, isChamp1: boolean): string => {
    if (advantage === 'even') return 'text-gray-400'
    if (advantage === 'champion1') {
      return isChamp1 ? 'text-green-400' : 'text-red-400'
    }
    return isChamp1 ? 'text-red-400' : 'text-green-400'
  }
  
  const getAdvantageIcon = (advantage: string, isChamp1: boolean) => {
    if (advantage === 'even') return <Minus className="w-3 h-3" />
    if (advantage === 'champion1') {
      return isChamp1 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
    }
    return isChamp1 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />
  }
  
  const getLaneIcon = (lane: string): string => {
    const icons: Record<string, string> = {
      'TOP': '🛡️',
      'JUNGLE': '🌲',
      'MIDDLE': '⚔️',
      'BOTTOM': '🏹',
      'UTILITY': '💫'
    }
    return icons[lane] || '📍'
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lane Matchup Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading matchup data...</div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="bg-[#0a0e1a] border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-base text-gray-200">Lane Matchup Statistics</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {Object.entries(matchups).map(([lane, matchup]) => {
            const team1Player = participants.find(p => 
              p.individualPosition === lane && p.championName === matchup.champion1
            )
            const team2Player = participants.find(p => 
              p.individualPosition === lane && p.championName === matchup.champion2
            )
            
            if (!team1Player || !team2Player) return null
            
            const isBlueTeam1 = team1Player.teamId === 100
            
            return (
              <div key={lane} className="border border-gray-700 rounded-lg p-3">
                {/* Lane Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{getLaneIcon(lane)}</span>
                  <span className="text-sm font-medium text-gray-300">{lane}</span>
                  <span className="text-xs text-gray-500">
                    ({matchup.games.toLocaleString()} games analyzed)
                  </span>
                </div>
                
                {/* Matchup Display */}
                <div className="grid grid-cols-5 gap-2 items-center">
                  {/* Champion 1 */}
                  <div className={`text-center ${isBlueTeam1 ? 'order-1' : 'order-5'}`}>
                    <div className={`rounded-lg p-2 ${
                      isBlueTeam1 ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-red-900/20 border border-red-500/30'
                    }`}>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${matchup.champion1}.png`}
                        alt={matchup.champion1}
                        className="w-12 h-12 mx-auto rounded"
                      />
                      <p className="text-xs mt-1 font-medium">{matchup.champion1}</p>
                      <div className={`flex items-center justify-center gap-1 mt-1 ${
                        getAdvantageColor(matchup.advantage, true)
                      }`}>
                        {getAdvantageIcon(matchup.advantage, true)}
                        <span className="text-xs font-bold">
                          {matchup.advantage === 'champion1' ? `${matchup.winRate}%` : `${100 - matchup.winRate}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* VS Indicator */}
                  <div className="text-center order-3 col-span-3">
                    <div className="relative">
                      {/* Win Rate Bar */}
                      <div className="w-full h-6 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div 
                            className={`${isBlueTeam1 ? 'bg-blue-500' : 'bg-red-500'} transition-all`}
                            style={{ width: `${matchup.winRate}%` }}
                          />
                          <div 
                            className={`${isBlueTeam1 ? 'bg-red-500' : 'bg-blue-500'} flex-1`}
                          />
                        </div>
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                        VS
                      </span>
                    </div>
                    
                    {/* Additional Stats */}
                    <div className="mt-2 flex justify-center gap-4 text-xs text-gray-400">
                      <span>
                        Solo Kill: {(matchup.laneKillRate * 100).toFixed(1)}%
                      </span>
                      <span>
                        CS@10: {matchup.csDifferential > 0 ? '+' : ''}{matchup.csDifferential.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Champion 2 */}
                  <div className={`text-center ${isBlueTeam1 ? 'order-5' : 'order-1'}`}>
                    <div className={`rounded-lg p-2 ${
                      !isBlueTeam1 ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-red-900/20 border border-red-500/30'
                    }`}>
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${matchup.champion2}.png`}
                        alt={matchup.champion2}
                        className="w-12 h-12 mx-auto rounded"
                      />
                      <p className="text-xs mt-1 font-medium">{matchup.champion2}</p>
                      <div className={`flex items-center justify-center gap-1 mt-1 ${
                        getAdvantageColor(matchup.advantage, false)
                      }`}>
                        {getAdvantageIcon(matchup.advantage, false)}
                        <span className="text-xs font-bold">
                          {matchup.advantage === 'champion2' ? `${100 - matchup.winRate}%` : `${matchup.winRate}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Matchup Insight */}
                <div className="mt-3 p-2 bg-gray-900/50 rounded text-xs text-gray-400">
                  {matchup.advantage === 'champion1' ? (
                    <span>
                      <span className={isBlueTeam1 ? 'text-blue-400' : 'text-red-400'}>
                        {matchup.champion1}
                      </span>
                      {' has a '}
                      <span className="text-green-400 font-medium">
                        {matchup.winRate > 55 ? 'strong' : 'slight'} advantage
                      </span>
                      {' in this matchup'}
                    </span>
                  ) : matchup.advantage === 'champion2' ? (
                    <span>
                      <span className={!isBlueTeam1 ? 'text-blue-400' : 'text-red-400'}>
                        {matchup.champion2}
                      </span>
                      {' has a '}
                      <span className="text-green-400 font-medium">
                        {matchup.winRate < 45 ? 'strong' : 'slight'} advantage
                      </span>
                      {' in this matchup'}
                    </span>
                  ) : (
                    <span>This is an <span className="text-yellow-400 font-medium">even matchup</span> - skill dependent</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Data Source Note */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Statistics based on Patch {gameVersion || '14.24'} • High Elo (Diamond+)</p>
          <p className="text-[10px] mt-1">Note: Using simulated data for demonstration</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default LaneMatchupStats