import React from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface PlayerStats {
  championName: string
  championIcon?: string
  riotIdGameName?: string
  summonerName?: string
  teamId: number
  kills: number
  deaths: number
  assists: number
  totalDamageDealtToChampions: number
  goldEarned?: number
  gold?: number
  totalGold?: number
  totalMinionsKilled: number
  neutralMinionsKilled: number
  visionScore: number
  win: boolean
  participantId?: number
  puuid?: string
  [key: string]: any
}

interface LaneMatchupComparisonProps {
  player: PlayerStats
  opponent: PlayerStats
  gameDurationMinutes: number
  playerTeamStats?: {
    totalKills: number
    totalDamage: number
  }
  opponentTeamStats?: {
    totalKills: number
    totalDamage: number
  }
  timeline?: {
    frames?: Array<{
      timestamp: number
      participantFrames: {
        [key: string]: {
          totalGold: number
          minionsKilled: number
          jungleMinionsKilled: number
        }
      }
    }>
  }
}

const LaneMatchupComparison: React.FC<LaneMatchupComparisonProps> = ({
  player,
  opponent,
  gameDurationMinutes,
  playerTeamStats,
  opponentTeamStats,
  timeline
}) => {
  const { t, i18n } = useTranslation()

  // Convert game duration to minutes if it's in seconds
  const gameDurationInMinutes = gameDurationMinutes > 100 ? gameDurationMinutes / 60 : gameDurationMinutes

  // Determine which player should be on which side based on team
  const isPlayerBlue = player.teamId === 100
  const leftPlayer = isPlayerBlue ? player : opponent
  const rightPlayer = isPlayerBlue ? opponent : player
  const leftTeamStats = isPlayerBlue ? playerTeamStats : opponentTeamStats
  const rightTeamStats = isPlayerBlue ? opponentTeamStats : playerTeamStats

  // Helper function to get gold value with fallbacks
  const getGold = (p: PlayerStats) => {
    return p.goldEarned || p.gold || p.totalGold || 0
  }

  // Calculate stats
  const calculateKDA = (p: PlayerStats) => {
    const kda = p.deaths === 0 ? (p.kills + p.assists) : (p.kills + p.assists) / p.deaths
    return kda.toFixed(1)
  }

  const calculateDPM = (p: PlayerStats) => {
    if (gameDurationInMinutes === 0) return 0
    return Math.round(p.totalDamageDealtToChampions / gameDurationInMinutes)
  }

  const calculateDamagePercent = (p: PlayerStats, teamStats?: { totalDamage: number }) => {
    if (!teamStats || teamStats.totalDamage === 0) return '0'
    return ((p.totalDamageDealtToChampions / teamStats.totalDamage) * 100).toFixed(1)
  }

  const calculateDamagePerGold = (p: PlayerStats) => {
    const gold = getGold(p) || 1
    return (p.totalDamageDealtToChampions / gold).toFixed(2)
  }

  const calculateKillParticipation = (p: PlayerStats, teamStats?: { totalKills: number }) => {
    if (!teamStats || teamStats.totalKills === 0) return '0'
    return (((p.kills + p.assists) / teamStats.totalKills) * 100).toFixed(1)
  }

  const getCSAt14 = (p: PlayerStats) => {
    // If we have timeline data, use it for accurate CS@14
    if (timeline?.frames) {
      const frame14min = timeline.frames.find(f => f.timestamp >= 840000) // 14 minutes in ms
      if (frame14min) {
        const participantId = p.participantId || p.puuid || `${p.championName}_${p.teamId}`
        const frameData = frame14min.participantFrames[participantId]
        if (frameData) {
          return frameData.minionsKilled + frameData.jungleMinionsKilled
        }
      }
    }
    // Fallback: estimate based on current CS and game time
    if (gameDurationInMinutes === 0) return 0
    const csPerMin = (p.totalMinionsKilled + p.neutralMinionsKilled) / gameDurationInMinutes
    return Math.round(csPerMin * 14)
  }

  const getGoldDiffAt14 = () => {
    // This would need timeline data to be accurate
    // For now, estimate based on current gold difference
    const leftGold = getGold(leftPlayer)
    const rightGold = getGold(rightPlayer)
    if (gameDurationInMinutes === 0) return 0
    const goldDiffPerMin = (leftGold - rightGold) / gameDurationInMinutes
    return Math.round(goldDiffPerMin * 14)
  }

  // Prepare comparison data
  const comparisons = [
    {
      label: 'KDA',
      leftValue: calculateKDA(leftPlayer),
      rightValue: calculateKDA(rightPlayer),
      format: 'number'
    },
    {
      label: 'DPM',
      subtitle: i18n.language === 'ja' ? '分当たりダメージ' : i18n.language === 'ko' ? '분당 데미지' : 'Damage/Min',
      leftValue: calculateDPM(leftPlayer),
      rightValue: calculateDPM(rightPlayer),
      format: 'number'
    },
    {
      label: 'DMG%',
      subtitle: i18n.language === 'ja' ? 'チーム内ダメージ比率' : i18n.language === 'ko' ? '팀 내 데미지 비율' : 'Team Damage %',
      leftValue: calculateDamagePercent(leftPlayer, leftTeamStats),
      rightValue: calculateDamagePercent(rightPlayer, rightTeamStats),
      format: 'percent'
    },
    {
      label: 'DMG/GOLD',
      subtitle: i18n.language === 'ja' ? 'ゴールド当たりダメージ' : i18n.language === 'ko' ? '골드당 데미지' : 'Damage per Gold',
      leftValue: calculateDamagePerGold(leftPlayer),
      rightValue: calculateDamagePerGold(rightPlayer),
      format: 'number'
    },
    {
      label: 'KP',
      subtitle: i18n.language === 'ja' ? 'キル関与率' : i18n.language === 'ko' ? '킬 관여율' : 'Kill Participation',
      leftValue: calculateKillParticipation(leftPlayer, leftTeamStats),
      rightValue: calculateKillParticipation(rightPlayer, rightTeamStats),
      format: 'percent'
    },
    {
      label: 'CS@14',
      subtitle: i18n.language === 'ja' ? '14分CS' : i18n.language === 'ko' ? '14분 CS' : 'CS at 14 min',
      leftValue: getCSAt14(leftPlayer),
      rightValue: getCSAt14(rightPlayer),
      format: 'number'
    },
    {
      label: 'GD@14',
      subtitle: i18n.language === 'ja' ? '14分ゴールド差' : i18n.language === 'ko' ? '14분 골드차' : 'Gold Diff at 14',
      leftValue: getGoldDiffAt14(),
      rightValue: 0,
      format: 'gold',
      isSingleValue: true
    }
  ]

  const getBarWidth = (value1: number, value2: number, isLeft: boolean) => {
    const total = Math.abs(value1) + Math.abs(value2)
    if (total === 0) return 50
    return isLeft ? (Math.abs(value1) / total) * 100 : (Math.abs(value2) / total) * 100
  }

  const formatValue = (value: any, format: string) => {
    if (format === 'percent') return `${value}%`
    if (format === 'gold') {
      const num = parseFloat(value.toString())
      return num > 0 ? `+${num}` : num.toString()
    }
    return value.toString()
  }

  return (
    <div className="bg-[#0a0e1a] rounded-lg border border-gray-800">
      {/* Header with title */}
      <div className="px-3 py-2 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-white">
          {i18n.language === 'ja' ? '対面比較' : i18n.language === 'ko' ? '라인 매치업' : 'Lane Matchup'}
        </h3>
      </div>
      
      <div className="p-3 space-y-2">
        {/* Header with champion icons - Blue on left, Red on right */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {leftPlayer.championIcon && (
              <img src={leftPlayer.championIcon} alt={leftPlayer.championName} className="w-8 h-8 rounded" />
            )}
            <div>
              <div className="font-semibold text-xs text-blue-400">
                {leftPlayer.riotIdGameName || leftPlayer.summonerName}
              </div>
              <div className="text-[10px] text-muted-foreground">{leftPlayer.championName}</div>
            </div>
            {leftPlayer.win && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">WIN</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {rightPlayer.win && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">WIN</span>
            )}
            <div className="text-right">
              <div className="font-semibold text-xs text-red-400">
                {rightPlayer.riotIdGameName || rightPlayer.summonerName}
              </div>
              <div className="text-[10px] text-muted-foreground">{rightPlayer.championName}</div>
            </div>
            {rightPlayer.championIcon && (
              <img src={rightPlayer.championIcon} alt={rightPlayer.championName} className="w-8 h-8 rounded" />
            )}
          </div>
        </div>

        {/* Stats comparison */}
        <div className="space-y-3">
          {comparisons.map((stat, idx) => {
            const leftVal = parseFloat(stat.leftValue.toString())
            const rightVal = parseFloat(stat.rightValue.toString())
            const leftWins = leftVal > rightVal
            
            if (stat.isSingleValue) {
              // For GD@14 - show clearly which player has advantage
              const goldDiff = leftVal
              const advantageAmount = Math.abs(goldDiff)
              const hasBlueAdvantage = goldDiff > 0
              const advantagePlayer = hasBlueAdvantage ? leftPlayer : rightPlayer
              const advantageColor = hasBlueAdvantage ? "text-blue-500" : "text-red-500"
              
              return (
                <div key={idx} className="border-t border-gray-700 pt-2">
                  <div className="text-center mb-1">
                    <div className="text-[10px] text-gray-400 font-semibold">{stat.label}</div>
                    {stat.subtitle && (
                      <div className="text-[9px] text-gray-500">{stat.subtitle}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      {advantagePlayer.championIcon && (
                        <img 
                          src={advantagePlayer.championIcon} 
                          alt={advantagePlayer.championName}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <span className={cn("text-sm font-bold", advantageColor)}>
                        +{advantageAmount}g
                      </span>
                      <span className="text-xs text-gray-300">
                        {i18n.language === 'ja' ? '有利' : 
                         i18n.language === 'ko' ? '유리' : 
                         'Advantage'}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500">
                      {advantagePlayer.championName}
                    </div>
                  </div>
                </div>
              )
            }

            return (
              <div key={idx} className="space-y-1">
                {/* Label at top */}
                <div className="text-center">
                  <div className="text-[10px] text-gray-300 font-semibold">{stat.label}</div>
                  {stat.subtitle && (
                    <div className="text-[9px] text-gray-500">{stat.subtitle}</div>
                  )}
                </div>
                
                {/* Values and bar */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "w-12 text-right text-xs font-bold",
                    leftWins ? "text-blue-400" : "text-gray-400"
                  )}>
                    {formatValue(stat.leftValue, stat.format)}
                  </span>
                  
                  {/* Bar graph */}
                  <div className="flex-1 mx-2 flex items-center h-3">
                    <div className="flex w-full h-full rounded-sm overflow-hidden bg-gray-700">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          leftWins ? "bg-blue-500" : "bg-gray-600"
                        )}
                        style={{ width: `${getBarWidth(leftVal, rightVal, true)}%` }}
                      />
                      <div 
                        className={cn(
                          "h-full transition-all",
                          !leftWins ? "bg-red-500" : "bg-gray-600"
                        )}
                        style={{ width: `${getBarWidth(leftVal, rightVal, false)}%` }}
                      />
                    </div>
                  </div>

                  <span className={cn(
                    "w-12 text-left text-xs font-bold",
                    !leftWins ? "text-red-400" : "text-gray-400"
                  )}>
                    {formatValue(stat.rightValue, stat.format)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default LaneMatchupComparison