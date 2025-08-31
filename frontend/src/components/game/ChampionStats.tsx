import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/services/api'
import { cn } from '@/lib/utils'

interface ChampionStat {
  championId: number
  championName: string
  games: number
  wins: number
  losses: number
  kills: number
  deaths: number
  assists: number
  cs: number
  csPerMin: number
  kda: string
  winRate: number
  positions?: string[]
}

interface PositionStat {
  position: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY'
  games: number
  wins: number
  winRate: number
}

interface ChampionStatsProps {
  stats: ChampionStat[]
  positionStats?: PositionStat[]
  season?: string
}

const ChampionStats: React.FC<ChampionStatsProps> = ({ stats, positionStats, season = 'S2025' }) => {
  const { t } = useTranslation()
  const [championIcons, setChampionIcons] = React.useState<{ [key: string]: string }>({})
  const [localizedNames, setLocalizedNames] = React.useState<{ [key: string]: string }>({})
  const [showAll, setShowAll] = React.useState(false)

  // Load champion icons and localized names
  React.useEffect(() => {
    const loadChampionData = async () => {
      const uniqueChampions = [...new Set(stats.map(s => s.championName))]
      
      // Load icons
      const iconPromises = uniqueChampions.map(async (name) => {
        try {
          const url = await apiClient.getChampionIconUrl(name)
          return { [name]: url }
        } catch {
          return null
        }
      })
      
      const iconResults = await Promise.all(iconPromises)
      const icons = iconResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
      setChampionIcons(icons)
      
      // Load localized names
      const namePromises = uniqueChampions.map(async (name) => {
        try {
          const localizedName = await apiClient.getChampionNameLocalized(name)
          return { [name]: localizedName }
        } catch {
          return { [name]: name }
        }
      })
      
      const nameResults = await Promise.all(namePromises)
      const names = nameResults.reduce((acc, curr) => ({ ...acc, ...curr }), {})
      setLocalizedNames(names)
    }
    
    if (stats.length > 0) {
      loadChampionData()
    }
  }, [stats])

  // Sort stats by games played
  const sortedStats = [...stats].sort((a, b) => b.games - a.games)
  
  // Position display mapping
  const getPositionDisplay = (position: string) => {
    const positionMap: { [key: string]: string } = {
      'TOP': 'TOP',
      'JUNGLE': 'JG',
      'MIDDLE': 'MID',
      'BOTTOM': 'BOT',
      'UTILITY': 'SUP'
    }
    return positionMap[position] || position
  }
  
  // Get position color
  const getPositionColor = (position: string) => {
    const colorMap: { [key: string]: string } = {
      'TOP': 'text-red-600 dark:text-red-400',
      'JUNGLE': 'text-green-600 dark:text-green-400',
      'MIDDLE': 'text-blue-600 dark:text-blue-400',
      'BOTTOM': 'text-purple-600 dark:text-purple-400',
      'UTILITY': 'text-yellow-600 dark:text-yellow-400'
    }
    return colorMap[position] || 'text-gray-600'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('summoner.championStats')}</CardTitle>
          <span className="text-xs text-muted-foreground">{season}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position Statistics */}
        {positionStats && positionStats.length > 0 && (
          <div className="pb-3 border-b">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">{t('summoner.positionStats')}</h4>
            <div className="flex gap-2 flex-wrap">
              {positionStats.map((pos) => (
                <div 
                  key={pos.position}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50"
                >
                  <span className={cn("text-xs font-bold", getPositionColor(pos.position))}>
                    {getPositionDisplay(pos.position)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pos.games}G
                  </span>
                  <span className={cn(
                    "text-xs font-medium",
                    pos.winRate >= 60 ? 'text-green-600' : 
                    pos.winRate >= 50 ? 'text-blue-600' : 
                    'text-red-600'
                  )}>
                    {pos.winRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Champion Statistics */}
        <div className="space-y-2">
          {sortedStats.slice(0, showAll ? undefined : 5).map((stat) => (
            <div key={stat.championId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              {/* Champion Icon */}
              <div className="flex-shrink-0">
                {championIcons[stat.championName] ? (
                  <img 
                    src={championIcons[stat.championName]}
                    alt={stat.championName}
                    className="w-8 h-8 rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 bg-muted rounded-lg" />
                )}
              </div>
              
              {/* Champion Name and Games */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-xs truncate">
                    {localizedNames[stat.championName] || stat.championName}
                  </span>
                  {stat.positions && stat.positions.length > 0 && (
                    <span className={cn("text-[10px] font-semibold", getPositionColor(stat.positions[0]))}>
                      {getPositionDisplay(stat.positions[0])}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{stat.games} {t('summoner.games')}</span>
                  <span>•</span>
                  <span>{stat.csPerMin.toFixed(1)} CS/m</span>
                </div>
              </div>
              
              {/* KDA */}
              <div className="text-right">
                <div className="text-xs font-medium">{stat.kda} KDA</div>
                <div className="text-[10px] text-muted-foreground">
                  {(stat.kills / stat.games).toFixed(1)}/{(stat.deaths / stat.games).toFixed(1)}/{(stat.assists / stat.games).toFixed(1)}
                </div>
              </div>
              
              {/* Win Rate */}
              <div className="text-right min-w-[60px]">
                <div className={cn(
                  "text-xs font-medium",
                  stat.winRate >= 60 ? 'text-green-600' : 
                  stat.winRate >= 50 ? 'text-blue-600' : 
                  'text-red-600'
                )}>
                  {stat.winRate}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {stat.wins}W {stat.losses}L
                </div>
              </div>
              
              {/* Win Rate Bar */}
              <div className="w-12">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all",
                      stat.winRate >= 60 ? 'bg-green-600' : 
                      stat.winRate >= 50 ? 'bg-blue-600' : 
                      'bg-red-600'
                    )}
                    style={{ width: `${stat.winRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {stats.length > 5 && (
            <button 
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary py-1 transition-colors"
            >
              {showAll ? t('common.showLess') : t('common.showMore')} ({stats.length - 5})
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ChampionStats