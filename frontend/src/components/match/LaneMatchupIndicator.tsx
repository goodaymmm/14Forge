import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LaneMatchupIndicatorProps {
  champion1: string
  champion2: string
  winRate?: number // Champion1's win rate against Champion2
  position: string
}

// Mock data generator - in production, this would fetch from an API
const generateMockWinRate = (champ1: string, champ2: string): number => {
  const seed = (champ1 + champ2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return 45 + (seed % 10)
}

const LaneMatchupIndicator = ({ champion1, champion2, winRate, position }: LaneMatchupIndicatorProps) => {
  // Use mock data if no win rate provided
  const actualWinRate = winRate ?? generateMockWinRate(champion1, champion2)
  
  // Determine advantage level
  const getAdvantageLevel = (wr: number) => {
    if (wr >= 55) return 'strong-advantage'
    if (wr >= 52) return 'slight-advantage'
    if (wr <= 45) return 'strong-disadvantage'
    if (wr <= 48) return 'slight-disadvantage'
    return 'even'
  }
  
  const advantage = getAdvantageLevel(actualWinRate)
  const isBlueAdvantage = actualWinRate > 50
  
  // Skip matchup display for jungle and invalid positions
  if (position === 'JUNGLE' || position === 'Invalid' || !position) {
    return null
  }
  
  return (
    <div className="mx-4 my-1 px-3 py-1.5 bg-gray-900/30 rounded-lg border border-gray-700/50">
      <div className="flex items-center justify-between">
        {/* Left side - Blue team champion */}
        <div className="flex items-center gap-2">
          <img 
            src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champion1}.png`}
            alt={champion1}
            className="w-6 h-6 rounded"
          />
          <span className={cn(
            "text-xs font-medium",
            isBlueAdvantage ? "text-green-400" : actualWinRate < 50 ? "text-red-400" : "text-gray-400"
          )}>
            {actualWinRate}%
          </span>
        </div>
        
        {/* Center - VS indicator with advantage arrow */}
        <div className="flex items-center gap-1">
          {advantage !== 'even' && (
            isBlueAdvantage ? (
              <TrendingUp className={cn(
                "w-3 h-3",
                advantage === 'strong-advantage' ? "text-green-400" : "text-green-400/70"
              )} />
            ) : (
              <TrendingDown className={cn(
                "w-3 h-3",
                advantage === 'strong-disadvantage' ? "text-red-400" : "text-red-400/70"
              )} />
            )
          )}
          <span className="text-[10px] text-gray-500 font-medium">VS</span>
          {advantage !== 'even' && (
            !isBlueAdvantage ? (
              <TrendingUp className={cn(
                "w-3 h-3",
                advantage === 'strong-disadvantage' ? "text-green-400" : "text-green-400/70"
              )} />
            ) : (
              <TrendingDown className={cn(
                "w-3 h-3",
                advantage === 'strong-advantage' ? "text-red-400" : "text-red-400/70"
              )} />
            )
          )}
        </div>
        
        {/* Right side - Red team champion */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium",
            !isBlueAdvantage ? "text-green-400" : actualWinRate > 50 ? "text-red-400" : "text-gray-400"
          )}>
            {100 - actualWinRate}%
          </span>
          <img 
            src={`https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/${champion2}.png`}
            alt={champion2}
            className="w-6 h-6 rounded"
          />
        </div>
      </div>
      
      {/* Advantage text */}
      <div className="text-center mt-1">
        <span className={cn(
          "text-[10px]",
          advantage === 'even' ? "text-gray-500" :
          advantage.includes('advantage') ? "text-green-400/70" :
          "text-red-400/70"
        )}>
          {advantage === 'even' ? 'Even Matchup' :
           advantage === 'strong-advantage' ? `${champion1} Strong Advantage` :
           advantage === 'slight-advantage' ? `${champion1} Slight Advantage` :
           advantage === 'strong-disadvantage' ? `${champion2} Strong Advantage` :
           `${champion2} Slight Advantage`}
        </span>
      </div>
    </div>
  )
}

export default LaneMatchupIndicator