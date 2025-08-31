import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompactLaneMatchupsProps {
  participants: any[]
}

// Mock data generator - in production, this would fetch from an API
const generateMockWinRate = (champ1: string, champ2: string): number => {
  const seed = (champ1 + champ2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return 45 + (seed % 10)
}

const CompactLaneMatchups = ({ participants }: CompactLaneMatchupsProps) => {
  // Include all positions including JUNGLE and UTILITY(Support)
  const lanes = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']
  
  const matchups = lanes.map(lane => {
    const blueSide = participants.find(p => p.teamId === 100 && p.individualPosition === lane)
    const redSide = participants.find(p => p.teamId === 200 && p.individualPosition === lane)
    
    if (!blueSide || !redSide) return null
    
    const winRate = generateMockWinRate(blueSide.championName, redSide.championName)
    const blueAdvantage = winRate > 50
    
    return {
      lane,
      blue: blueSide.championName,
      red: redSide.championName,
      winRate,
      blueAdvantage
    }
  }).filter(Boolean)
  
  if (matchups.length === 0) return null
  
  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="text-sm font-medium text-gray-400 mb-3">Lane Matchups</div>
      <div className="flex gap-3 justify-center flex-wrap">
        {matchups.map((matchup) => {
          const laneLabel = matchup!.lane === 'UTILITY' ? 'SUP' : 
                           matchup!.lane === 'JUNGLE' ? 'JG' : 
                           matchup!.lane === 'MIDDLE' ? 'MID' : 
                           matchup!.lane.slice(0, 3)
          return (
            <div key={matchup!.lane} className="flex items-center gap-2 px-3 py-2 bg-gray-900/30 rounded-lg">
              {/* Lane label */}
              <span className="text-xs font-bold text-gray-400 mr-1">
                {laneLabel}
              </span>
              
              {/* Blue champion */}
              <div className="flex items-center gap-1">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${matchup!.blue}.png`}
                  alt={matchup!.blue}
                  className="w-8 h-8 rounded"
                />
              {matchup!.blueAdvantage && (
                <TrendingUp className="w-3 h-3 text-green-400" />
              )}
            </div>
            
            {/* Win rate indicator */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                <span className={cn(
                  "text-[10px] font-bold",
                  matchup!.blueAdvantage ? "text-blue-400" : "text-gray-500"
                )}>
                  {matchup!.winRate}
                </span>
                <span className="text-[10px] text-gray-600">-</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  !matchup!.blueAdvantage ? "text-red-400" : "text-gray-500"
                )}>
                  {100 - matchup!.winRate}
                </span>
              </div>
              <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden mt-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-red-500"
                  style={{ 
                    width: '100%',
                    backgroundPosition: `${matchup!.winRate - 50}% 0`
                  }}
                />
              </div>
            </div>
            
              {/* Red champion */}
              <div className="flex items-center gap-1">
                {!matchup!.blueAdvantage && (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                )}
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${matchup!.red}.png`}
                  alt={matchup!.red}
                  className="w-8 h-8 rounded"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CompactLaneMatchups