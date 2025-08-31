import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, User, Trophy, TrendingUp, Clock, ChevronDown, ChevronUp, Swords, Shield, Eye, RefreshCw, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/services/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ChampionStats from '@/components/game/ChampionStats'
import ItemTooltip from '@/components/game/ItemTooltip'

const SummonerPage = () => {
  const { region, summonerName } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const [profileIconUrl, setProfileIconUrl] = useState<string | null>(null)
  const [championIcons, setChampionIcons] = useState<{ [key: string]: string }>({})
  const [itemIcons, setItemIcons] = useState<{ [key: number]: string }>({})
  const [summonerSpellIcons, setSummonerSpellIcons] = useState<{ [key: number]: string }>({})
  const [runeIcons, setRuneIcons] = useState<{ [key: number]: string }>({})
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set())
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [copiedPuuid, setCopiedPuuid] = useState(false)
  const [localizedChampionNames, setLocalizedChampionNames] = useState<{ [key: string]: string }>({})

  const toggleMatchExpansion = (matchId: string) => {
    setExpandedMatches(prev => {
      const newSet = new Set(prev)
      if (newSet.has(matchId)) {
        newSet.delete(matchId)
      } else {
        newSet.add(matchId)
      }
      return newSet
    })
  }
  
  // Get relative time string
  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)
    
    if (diffSec < 60) return t('summoner.secondsAgo')
    if (diffMin < 60) return t('summoner.minutesAgo', { count: diffMin })
    if (diffHour < 24) return t('summoner.hoursAgo', { count: diffHour })
    return t('summoner.daysAgo', { count: diffDay })
  }

  const { data: summoner, isLoading, error, refetch: refetchSummoner } = useQuery({
    queryKey: ['summoner', region, summonerName],
    queryFn: () => apiClient.getSummoner(region!, summonerName!),
    enabled: !!region && !!summonerName, // Auto-fetch basic summoner info on search
  })

  const { data: matches, refetch: refetchMatches } = useQuery({
    queryKey: ['matches', region, summoner?.data?.summoner?.puuid],
    queryFn: () => apiClient.getMatchHistory(region!, summoner.data.summoner.puuid),
    enabled: !!summoner?.data?.summoner?.puuid, // Auto-fetch when puuid is available
  })

  // Load profile icon URL
  useEffect(() => {
    if (summoner?.data?.summoner?.profileIconId) {
      apiClient.getProfileIconUrl(summoner.data.summoner.profileIconId)
        .then(url => setProfileIconUrl(url))
        .catch(err => console.error('Failed to load profile icon:', err))
    }
  }, [summoner?.data?.summoner?.profileIconId])

  // Helper function to format tier and rank display
  const getTierDisplayName = (tier: string): string => {
    const tierMap: Record<string, string> = {
      'IRON': 'Iron',
      'BRONZE': 'Bronze',
      'SILVER': 'Silver',
      'GOLD': 'Gold',
      'PLATINUM': 'Platinum',
      'EMERALD': 'Emerald',
      'DIAMOND': 'Diamond',
      'MASTER': 'Master',
      'GRANDMASTER': 'Grandmaster',
      'CHALLENGER': 'Challenger'
    };
    return tierMap[tier] || tier;
  };

  const getRankDisplayNumber = (rank: string): string => {
    const rankMap: Record<string, string> = {
      'I': '1',
      'II': '2',
      'III': '3',
      'IV': '4'
    };
    return rankMap[rank] || '';
  };

  // Helper function to calculate champion and position stats
  const calculateChampionStats = (matches: any[]) => {
    const statsMap = new Map()
    const positionMap = new Map()
    
    matches.forEach(match => {
      const p = match.participant
      if (!p) return
      
      // Champion stats
      const key = p.championName
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          championId: p.championId,
          championName: p.championName,
          games: 0,
          wins: 0,
          losses: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          cs: 0,
          csPerMin: 0,
          kda: '0.00',
          winRate: 0,
          positions: []
        })
      }
      
      const stats = statsMap.get(key)
      stats.games++
      if (match.win) stats.wins++
      else stats.losses++
      stats.kills += p.kills
      stats.deaths += p.deaths
      stats.assists += p.assists
      stats.cs += (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0)
      
      // Track positions played
      if (p.individualPosition && !stats.positions.includes(p.individualPosition)) {
        stats.positions.push(p.individualPosition)
      }
      
      // Position stats
      const position = p.individualPosition || p.teamPosition
      if (position) {
        if (!positionMap.has(position)) {
          positionMap.set(position, {
            position,
            games: 0,
            wins: 0,
            winRate: 0
          })
        }
        const posStats = positionMap.get(position)
        posStats.games++
        if (match.win) posStats.wins++
        posStats.winRate = Math.round((posStats.wins / posStats.games) * 100)
      }
      
      // Calculate averages
      const avgKills = stats.kills / stats.games
      const avgDeaths = stats.deaths / stats.games
      const avgAssists = stats.assists / stats.games
      stats.kda = avgDeaths === 0 ? '∞' : ((avgKills + avgAssists) / avgDeaths).toFixed(2)
      stats.csPerMin = stats.cs / stats.games / ((match.gameDuration || 1800) / 60)
      stats.winRate = Math.round((stats.wins / stats.games) * 100)
    })
    
    return {
      championStats: Array.from(statsMap.values()),
      positionStats: Array.from(positionMap.values())
    }
  }

  // Load champion icons and localized names for matches
  useEffect(() => {
    const loadIcons = async () => {
      if (!matches?.data?.matches) return

      try {
        // Collect unique champion names from all participants
        const uniqueChampions = [...new Set(
          matches.data.matches.flatMap((m: any) => [
            m.participant?.championName,
            ...(m.allParticipants?.map((p: any) => p.championName) || [])
          ]).filter(Boolean)
        )]

        // Load champion icons
        const championPromises = uniqueChampions.map(async (championName) => {
          if (!championIcons[championName]) {
            try {
              const url = await apiClient.getChampionIconUrl(championName)
              return { [championName]: url }
            } catch (err) {
              console.error(`Failed to load champion icon for ${championName}:`, err)
              return null
            }
          }
          return null
        })
        
        // Load localized champion names
        const namePromises = uniqueChampions.map(async (championName) => {
          if (!localizedChampionNames[championName]) {
            try {
              const localizedName = await apiClient.getChampionNameLocalized(championName)
              return { [championName]: localizedName }
            } catch (err) {
              console.error(`Failed to load localized name for ${championName}:`, err)
              return { [championName]: championName }
            }
          }
          return null
        })

        const championResults = await Promise.all(championPromises)
        const newChampionIcons = championResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newChampionIcons).length > 0) {
          setChampionIcons(prev => ({ ...prev, ...newChampionIcons }))
        }
        
        const nameResults = await Promise.all(namePromises)
        const newLocalizedNames = nameResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newLocalizedNames).length > 0) {
          setLocalizedChampionNames(prev => ({ ...prev, ...newLocalizedNames }))
        }

        // Collect unique item IDs
        const uniqueItems = [...new Set(
          matches.data.matches.flatMap((m: any) => [
            m.participant?.item0,
            m.participant?.item1,
            m.participant?.item2,
            m.participant?.item3,
            m.participant?.item4,
            m.participant?.item5,
            m.participant?.item6
          ].filter(id => id && id !== 0))
        )]

        // Load item icons
        const itemPromises = uniqueItems.map(async (itemId) => {
          if (!itemIcons[itemId]) {
            try {
              const url = await apiClient.getItemIconUrl(itemId)
              return { [itemId]: url }
            } catch (err) {
              console.error(`Failed to load item icon for ${itemId}:`, err)
              return null
            }
          }
          return null
        })

        const itemResults = await Promise.all(itemPromises)
        const newItemIcons = itemResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newItemIcons).length > 0) {
          setItemIcons(prev => ({ ...prev, ...newItemIcons }))
        }

        // Load summoner spell icons from allParticipants data
        const allParticipantSpells = matches.data.matches.flatMap((m: any) => 
          m.allParticipants?.flatMap((p: any) => [p.summoner1Id, p.summoner2Id].filter(Boolean)) || []
        )
        const uniqueSpells = [...new Set(allParticipantSpells)]

        const spellPromises = uniqueSpells.map(async (spellId) => {
          if (!summonerSpellIcons[spellId]) {
            try {
              const url = await apiClient.getSummonerSpellIconUrl(spellId)
              return { [spellId]: url }
            } catch (err) {
              console.error(`Failed to load spell icon for ${spellId}:`, err)
              return null
            }
          }
          return null
        })

        const spellResults = await Promise.all(spellPromises)
        const newSpellIcons = spellResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newSpellIcons).length > 0) {
          setSummonerSpellIcons(prev => ({ ...prev, ...newSpellIcons }))
        }
        
        // Load rune icons from perks data
        const allRunes = matches.data.matches.flatMap((m: any) => [
          ...(m.participant?.perks?.styles?.flatMap((style: any) => 
            style.selections?.map((s: any) => s.perk)
          ).filter(Boolean) || []),
          ...(m.allParticipants?.flatMap((p: any) => 
            p.perks?.styles?.flatMap((style: any) => 
              style.selections?.map((s: any) => s.perk)
            ).filter(Boolean) || []
          ) || [])
        ])
        const uniqueRunes = [...new Set(allRunes)]
        
        const runePromises = uniqueRunes.map(async (runeId) => {
          if (!runeIcons[runeId]) {
            try {
              const url = await apiClient.getRuneIconUrl(runeId)
              return { [runeId]: url }
            } catch (err) {
              console.error(`Failed to load rune icon for ${runeId}:`, err)
              return null
            }
          }
          return null
        })
        
        const runeResults = await Promise.all(runePromises)
        const newRuneIcons = runeResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newRuneIcons).length > 0) {
          setRuneIcons(prev => ({ ...prev, ...newRuneIcons }))
        }

        // Also load champion icons for all participants
        const allParticipantChampions = [...new Set(
          matches.data.matches.flatMap((m: any) => 
            m.allParticipants?.map((p: any) => p.championName).filter(Boolean) || []
          )
        )]

        const allChampionPromises = allParticipantChampions.map(async (championName) => {
          if (!championIcons[championName]) {
            try {
              const url = await apiClient.getChampionIconUrl(championName)
              return { [championName]: url }
            } catch (err) {
              console.error(`Failed to load champion icon for ${championName}:`, err)
              return null
            }
          }
          return null
        })

        const allChampionResults = await Promise.all(allChampionPromises)
        const newAllChampionIcons = allChampionResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newAllChampionIcons).length > 0) {
          setChampionIcons(prev => ({ ...prev, ...newAllChampionIcons }))
        }

        // Load items for all participants
        const allParticipantItems = [...new Set(
          matches.data.matches.flatMap((m: any) => 
            m.allParticipants?.flatMap((p: any) => [
              p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6
            ].filter(id => id && id !== 0)) || []
          )
        )]

        const allItemPromises = allParticipantItems.map(async (itemId) => {
          if (!itemIcons[itemId]) {
            try {
              const url = await apiClient.getItemIconUrl(itemId)
              return { [itemId]: url }
            } catch (err) {
              console.error(`Failed to load item icon for ${itemId}:`, err)
              return null
            }
          }
          return null
        })

        const allItemResults = await Promise.all(allItemPromises)
        const newAllItemIcons = allItemResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newAllItemIcons).length > 0) {
          setItemIcons(prev => ({ ...prev, ...newAllItemIcons }))
        }

        // Debug: Log first match participant perks structure
        if (matches.data.matches.length > 0 && matches.data.matches[0].allParticipants?.length > 0) {
          console.log('Debug - First participant perks:', matches.data.matches[0].allParticipants[0].perks)
        }

        // Load runes and rune styles for all participants
        const allParticipantRunes = [...new Set(
          matches.data.matches.flatMap((m: any) => 
            m.allParticipants?.flatMap((p: any) => {
              const runes = []
              if (p.perks?.styles?.[0]?.selections?.[0]?.perk) {
                runes.push({ id: p.perks.styles[0].selections[0].perk, type: 'rune' })
              }
              if (p.perks?.styles?.[1]?.style) {
                runes.push({ id: p.perks.styles[1].style, type: 'style' })
              }
              return runes
            }) || []
          )
        )]

        const allRunePromises = allParticipantRunes.map(async (runeData) => {
          if (!runeIcons[runeData.id]) {
            try {
              const url = runeData.type === 'style' 
                ? await apiClient.getRuneStyleIconUrl(runeData.id)
                : await apiClient.getRuneIconUrl(runeData.id)
              return { [runeData.id]: url }
            } catch (err) {
              console.error(`Failed to load ${runeData.type} icon for ${runeData.id}:`, err)
              return null
            }
          }
          return null
        })

        const allRuneResults = await Promise.all(allRunePromises)
        const newAllRuneIcons = allRuneResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newAllRuneIcons).length > 0) {
          setRuneIcons(prev => ({ ...prev, ...newAllRuneIcons }))
        }
      } catch (error) {
        console.error('Error loading icons:', error)
      }
    }

    loadIcons()
  }, [matches?.data?.matches])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.backToSearch')}
        </Button>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t('common.notFound')}</CardTitle>
            <CardDescription>
              {t('summoner.notFound', { name: summonerName, region: region?.toUpperCase() })}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const summonerData = summoner?.data?.summoner
  const rankedData = summoner?.data?.ranked

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.backToSearch')}
      </Button>

      {/* Main Layout - OPGG Style */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar - Summoner Info, Rank, Champion Stats */}
        <div className="lg:w-[340px] space-y-4">
        {/* Summoner Info Card */}
        <Card>
          <CardHeader>
            <div className="space-y-4">
              {/* Profile Icon and Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profileIconUrl ? (
                    <img 
                      src={profileIconUrl} 
                      alt="Profile Icon"
                      className="w-24 h-24 rounded-lg border-2 border-primary"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-12 h-12 text-white" />
                    </div>
                  )}
                  {summonerData?.summonerLevel > 0 && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-sm font-bold px-2 py-1 rounded">
                      {summonerData.summonerLevel}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{summonerData?.name}</CardTitle>
                  <CardDescription>
                    {summonerData?.summonerLevel > 0 
                      ? `${t('common.level')} ${summonerData.summonerLevel}` 
                      : t('common.loading')}
                  </CardDescription>
                </div>
              </div>
              
              {/* PUUID Display - Hidden by default */}
              
              {/* Update Button and Last Update Time */}
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={async () => {
                    setLastUpdateTime(new Date())
                    const summonerResult = await refetchSummoner()
                    if (summonerResult.data?.data?.summoner?.puuid) {
                      await refetchMatches()
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {!summoner ? t('summoner.loadStats') : t('summoner.updateStats')}
                    </>
                  )}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  {lastUpdateTime ? (
                    <>{t('summoner.lastUpdate')}: {getRelativeTime(lastUpdateTime)}</>
                  ) : (
                    <>{t('summoner.notUpdatedYet')}</>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Ranked Info */}
        {rankedData?.soloQueue && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <CardTitle>{t('summoner.rankedSoloDuo')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={apiClient.getRankEmblemUrl(rankedData.soloQueue.tier, rankedData.soloQueue.rank)}
                    alt={`${rankedData.soloQueue.tier} ${rankedData.soloQueue.rank}`}
                    className="w-36 h-36"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className={`tier-badge tier-badge-${rankedData.soloQueue.tier.toLowerCase()} inline-block`}>
                    {rankedData.soloQueue.tier} {rankedData.soloQueue.rank}
                  </div>
                  <p className="text-sm">
                    {rankedData.soloQueue.leaguePoints} LP
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('summoner.wins', { count: rankedData.soloQueue.wins })} {t('summoner.losses', { count: rankedData.soloQueue.losses })} ({t('summoner.winRate', { rate: rankedData.soloQueue.winRate })})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {rankedData?.flexQueue && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gray-500" />
                <CardTitle>{t('summoner.rankedFlex')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <img 
                    src={apiClient.getRankEmblemUrl(rankedData.flexQueue.tier, rankedData.flexQueue.rank)}
                    alt={`${rankedData.flexQueue.tier} ${rankedData.flexQueue.rank}`}
                    className="w-36 h-36"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className={`tier-badge tier-badge-${rankedData.flexQueue.tier.toLowerCase()} inline-block`}>
                    {rankedData.flexQueue.tier} {rankedData.flexQueue.rank}
                  </div>
                  <p className="text-sm">
                    {rankedData.flexQueue.leaguePoints} LP
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('summoner.wins', { count: rankedData.flexQueue.wins })} {t('summoner.losses', { count: rankedData.flexQueue.losses })} ({t('summoner.winRate', { rate: rankedData.flexQueue.winRate })})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
          {/* Champion Statistics */}
          {matches?.data?.matches && (() => {
            const { championStats, positionStats } = calculateChampionStats(matches.data.matches)
            return (
              <ChampionStats 
                stats={championStats} 
                positionStats={positionStats}
                season="S2025"
              />
            )
          })()}
        </div>
        
        {/* Right Main Content - Recent Matches */}
        <div className="flex-1">
          <Card>
        <CardHeader>
          <CardTitle>{t('summoner.recentMatches')}</CardTitle>
          <CardDescription>{t('summoner.lastGames', { count: 10 })}</CardDescription>
        </CardHeader>
        <CardContent>
          {matches?.data?.matches?.length > 0 ? (
            <div className="space-y-2">
              {matches.data.matches.map((match: any) => (
                <div
                  key={match.matchId}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200",
                    match.win 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30" 
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMatchExpansion(match.matchId)
                  }}
                >
                  <div className="space-y-3">
                    {/* Top row: Champion, KDA, Game info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Champion Icon with Spells and Runes */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {/* Champion Icon */}
                            {championIcons[match.participant?.championName] ? (
                              <img 
                                src={championIcons[match.participant.championName]}
                                alt={match.participant.championName}
                                className="w-12 h-12 rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded-lg"></div>
                            )}
                            
                            {/* Summoner Spells */}
                            <div className="flex flex-col gap-1">
                              {match.participant?.summoner1Id && summonerSpellIcons[match.participant.summoner1Id] && (
                                <img 
                                  src={summonerSpellIcons[match.participant.summoner1Id]}
                                  alt="Spell 1"
                                  className="w-5 h-5 rounded"
                                />
                              )}
                              {match.participant?.summoner2Id && summonerSpellIcons[match.participant.summoner2Id] && (
                                <img 
                                  src={summonerSpellIcons[match.participant.summoner2Id]}
                                  alt="Spell 2"
                                  className="w-5 h-5 rounded"
                                />
                              )}
                            </div>
                            
                            {/* Runes */}
                            <div className="flex flex-col gap-1">
                              {match.participant?.perks?.styles?.[0]?.selections?.[0]?.perk && runeIcons[match.participant.perks.styles[0].selections[0].perk] ? (
                                <img 
                                  src={runeIcons[match.participant.perks.styles[0].selections[0].perk]}
                                  alt="Main Rune"
                                  className="w-5 h-5 rounded"
                                />
                              ) : (
                                <div className="w-5 h-5 bg-muted/50 rounded" />
                              )}
                              {match.participant?.perks?.styles?.[1]?.style && runeIcons[match.participant.perks.styles[1].style] ? (
                                <img 
                                  src={runeIcons[match.participant.perks.styles[1].style]}
                                  alt="Sub Rune Style"
                                  className="w-5 h-5 rounded"
                                />
                              ) : match.participant?.perks?.styles?.[1]?.style ? (
                                <div className="w-5 h-5 rounded bg-muted/50" title={t('summoner.subRune')} />
                              ) : null}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-medium">
                              {localizedChampionNames[match.participant.championName] || match.participant.championName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Level {match.participant?.champLevel || 0}
                            </div>
                          </div>
                        </div>
                        
                        {/* KDA */}
                        <div className="text-center">
                          <div className={cn(
                            "text-lg font-bold",
                            (typeof match.participant.kda === 'number' ? match.participant.kda : parseFloat(match.participant.kda)) >= 3 ? "text-green-600 dark:text-green-400" : 
                            (typeof match.participant.kda === 'number' ? match.participant.kda : parseFloat(match.participant.kda)) >= 2 ? "text-yellow-600 dark:text-yellow-400" : 
                            "text-red-600 dark:text-red-400"
                          )}>
                            {match.participant.kills}/{match.participant.deaths}/{match.participant.assists}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {typeof match.participant.kda === 'number' 
                              ? match.participant.kda.toFixed(2) 
                              : match.participant.kda} KDA
                          </div>
                        </div>

                        {/* CS and Duration */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-xs text-muted-foreground">
                            {match.gameDuration && match.gameDuration > 0 
                              ? (((match.participant?.totalMinionsKilled || 0) + (match.participant?.neutralMinionsKilled || 0)) / (match.gameDuration / 60)).toFixed(1)
                              : '0.0'} CS/min | {match.participant?.visionScore || 0} Vision | {Math.floor((match.gameDuration || 0) / 60)}:{String((match.gameDuration || 0) % 60).padStart(2, '0')}
                          </div>
                          
                          {/* Average Tier Display */}
                          {match.averageTier && (
                            <div className="flex items-center gap-1">
                              <img 
                                src={apiClient.getRankEmblemUrl(match.averageTier.tier, match.averageTier.division)}
                                alt={`${match.averageTier.tier} ${match.averageTier.division}`}
                                className="w-6 h-6"
                              />
                              <span className="text-xs text-muted-foreground">
                                {match.averageTier.tier} {match.averageTier.division}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Victory/Defeat and 14min analysis */}
                      <div className="flex items-center gap-3">
                        {match.queueId === 420 && (
                          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">{t('summoner.minuteAnalysis', { minutes: 14 })}</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/${region}/match/${match.matchId}`, { 
                            state: { 
                              summonerName: summonerData?.name,
                              puuid: summonerData?.puuid
                            } 
                          })}
                          className="text-xs"
                        >
                          Details
                        </Button>
                        <span className={cn(
                          "text-sm font-bold px-3 py-1 rounded",
                          match.win 
                            ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40" 
                            : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40"
                        )}>
                          {match.win ? t('summoner.victory') : t('summoner.defeat')}
                        </span>
                        <button className="ml-2">
                          {expandedMatches.has(match.matchId) ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Bottom row: Items */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                          const itemId = match.participant?.[`item${slot}`]
                          return (
                            <div key={slot} className="w-8 h-8 bg-muted/50 rounded border border-border">
                              {itemId && itemId !== 0 && itemId !== '0' ? (
                                <ItemTooltip itemId={typeof itemId === 'string' ? parseInt(itemId) : itemId}>
                                  {itemIcons[itemId] ? (
                                    <img 
                                      src={itemIcons[itemId]}
                                      alt={`Item ${itemId}`}
                                      className="w-full h-full rounded cursor-help"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-muted/80 rounded animate-pulse"></div>
                                  )}
                                </ItemTooltip>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Match Details */}
                  {expandedMatches.has(match.matchId) && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                        {/* Enhanced Team Scoreboard */}
                        <div className="col-span-2">
                          <h4 className="font-semibold text-sm mb-3">{t('summoner.teamOverview')}</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Blue Team */}
                            <div className="space-y-2">
                              <div className="font-semibold text-sm text-blue-600 dark:text-blue-400 mb-2">{t('summoner.blueTeam')}</div>
                              {matches.data.matches
                                .find((m: any) => m.matchId === match.matchId)?.allParticipants
                                ?.filter((p: any) => p.teamId === 100)
                                .sort((a: any, b: any) => {
                                  const posOrder: { [key: string]: number } = { TOP: 0, JUNGLE: 1, MIDDLE: 2, BOTTOM: 3, UTILITY: 4 }
                                  return (posOrder[a.individualPosition] ?? 5) - (posOrder[b.individualPosition] ?? 5)
                                })
                                .map((p: any, idx: number) => {
                                  const kda = p.deaths === 0 ? p.kills + p.assists : ((p.kills + p.assists) / p.deaths)
                                  const csPerMin = match.gameDuration ? ((p.totalMinionsKilled + p.neutralMinionsKilled) / (match.gameDuration / 60)).toFixed(1) : '0.0'
                                  const currentName = summonerData?.gameName || summonerData?.name?.split('#')[0] || summonerData?.name
                                  const isCurrentPlayer = (p.riotIdGameName?.toLowerCase().trim() === currentName?.toLowerCase().trim()) || 
                                                        (p.summonerName?.toLowerCase().trim() === currentName?.toLowerCase().trim())
                                  return (
                                    <div key={idx} className={cn(
                                      "p-2 rounded-lg border",
                                      isCurrentPlayer 
                                        ? "bg-yellow-100/50 dark:bg-yellow-900/30 border-yellow-500" 
                                        : "bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-800/50"
                                    )}>
                                      <div className="flex items-center gap-2">
                                        {/* Champion Icon */}
                                        {championIcons[p.championName] ? (
                                          <img 
                                            src={championIcons[p.championName]}
                                            alt={p.championName}
                                            className="w-8 h-8 rounded"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-muted rounded"></div>
                                        )}
                                        
                                        {/* Rank Icon */}
                                        {p.rankedInfo && (
                                          <img 
                                            src={apiClient.getRankEmblemUrl(p.rankedInfo.tier, p.rankedInfo.rank)}
                                            alt={`${p.rankedInfo.tier} ${p.rankedInfo.rank}`}
                                            className="w-6 h-6"
                                            title={`${p.rankedInfo.tier} ${p.rankedInfo.rank}`}
                                          />
                                        )}
                                        
                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium truncate" title={`${p.riotIdGameName || p.summonerName}`}>
                                              {p.riotIdGameName || p.summonerName}
                                              {p.rankedInfo ? (
                                                <span className="text-muted-foreground ml-1">
                                                  ({getTierDisplayName(p.rankedInfo.tier)} {getRankDisplayNumber(p.rankedInfo.rank)})
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground ml-1">
                                                  (Lv.{p.summonerLevel || '?'})
                                                </span>
                                              )}
                                            </span>
                                            {isCurrentPlayer && (
                                              <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                                                YOU
                                              </span>
                                            )}
                                            {/* Summoner Spells */}
                                            <div className="flex gap-0.5">
                                              {summonerSpellIcons[p.summoner1Id] && (
                                                <img 
                                                  src={summonerSpellIcons[p.summoner1Id]}
                                                  alt="Spell 1"
                                                  className="w-4 h-4 rounded"
                                                />
                                              )}
                                              {summonerSpellIcons[p.summoner2Id] && (
                                                <img 
                                                  src={summonerSpellIcons[p.summoner2Id]}
                                                  alt="Spell 2"
                                                  className="w-4 h-4 rounded"
                                                />
                                              )}
                                            </div>
                                            {/* Runes */}
                                            <div className="flex gap-0.5">
                                              {p.perks?.styles?.[0]?.selections?.[0]?.perk && (
                                                <img 
                                                  src={runeIcons[p.perks.styles[0].selections[0].perk] || apiClient.getRuneIconUrl(p.perks.styles[0].selections[0].perk)}
                                                  alt="Main Rune"
                                                  className="w-4 h-4 rounded"
                                                  title={t('summoner.mainRune')}
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                              )}
                                              {p.perks?.styles?.[1]?.style && runeIcons[p.perks.styles[1].style] && (
                                                <img 
                                                  src={runeIcons[p.perks.styles[1].style]}
                                                  alt="Sub Rune Style"
                                                  className="w-4 h-4 rounded opacity-70"
                                                  title={t('summoner.subRune')}
                                                />
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Stats */}
                                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                            <span className={cn(
                                              "font-semibold",
                                              kda >= 3 ? "text-green-600 dark:text-green-400" : 
                                              kda >= 2 ? "text-yellow-600 dark:text-yellow-400" : 
                                              "text-red-600 dark:text-red-400"
                                            )}>
                                              {p.kills}/{p.deaths}/{p.assists}
                                            </span>
                                            <span>{((p.totalDamageDealtToChampions || 0) / 1000).toFixed(0)}k dmg</span>
                                            <span>{p.totalMinionsKilled + p.neutralMinionsKilled} CS ({csPerMin}/m)</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Items and Vision Stats */}
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex gap-0.5">
                                          {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                                            const itemId = p[`item${slot}`]
                                            return (
                                              <div key={slot} className="w-4 h-4 bg-muted/50 rounded border border-border">
                                                {itemId && itemId !== 0 && itemId !== '0' ? (
                                                  <ItemTooltip itemId={typeof itemId === 'string' ? parseInt(itemId) : itemId}>
                                                    {itemIcons[itemId] ? (
                                                      <img 
                                                        src={itemIcons[itemId]}
                                                        alt={`Item ${itemId}`}
                                                        className="w-full h-full rounded cursor-help"
                                                      />
                                                    ) : (
                                                      <div className="w-full h-full bg-muted/80 rounded animate-pulse"></div>
                                                    )}
                                                  </ItemTooltip>
                                                ) : null}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        {/* Vision Stats */}
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span>{p.visionScore || 0} Vision</span>
                                          <span>{t('summoner.wardsPlaced')}: {p.wardsPlaced || 0}</span>
                                          <span>{t('summoner.controlWards')}: {p.visionWardsBoughtInGame || 0}</span>
                                          <span>{t('summoner.wardsKilled')}: {p.wardsKilled || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                            
                            {/* Red Team */}
                            <div className="space-y-2">
                              <div className="font-semibold text-sm text-red-600 dark:text-red-400 mb-2">{t('summoner.redTeam')}</div>
                              {matches.data.matches
                                .find((m: any) => m.matchId === match.matchId)?.allParticipants
                                ?.filter((p: any) => p.teamId === 200)
                                .sort((a: any, b: any) => {
                                  const posOrder: { [key: string]: number } = { TOP: 0, JUNGLE: 1, MIDDLE: 2, BOTTOM: 3, UTILITY: 4 }
                                  return (posOrder[a.individualPosition] ?? 5) - (posOrder[b.individualPosition] ?? 5)
                                })
                                .map((p: any, idx: number) => {
                                  const kda = p.deaths === 0 ? p.kills + p.assists : ((p.kills + p.assists) / p.deaths)
                                  const csPerMin = match.gameDuration ? ((p.totalMinionsKilled + p.neutralMinionsKilled) / (match.gameDuration / 60)).toFixed(1) : '0.0'
                                  const currentName = summonerData?.gameName || summonerData?.name?.split('#')[0] || summonerData?.name
                                  const isCurrentPlayer = (p.riotIdGameName?.toLowerCase().trim() === currentName?.toLowerCase().trim()) || 
                                                        (p.summonerName?.toLowerCase().trim() === currentName?.toLowerCase().trim())
                                  return (
                                    <div key={idx} className={cn(
                                      "p-2 rounded-lg border",
                                      isCurrentPlayer 
                                        ? "bg-yellow-100/50 dark:bg-yellow-900/30 border-yellow-500" 
                                        : "bg-red-50/30 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/50"
                                    )}>
                                      <div className="flex items-center gap-2">
                                        {/* Champion Icon */}
                                        {championIcons[p.championName] ? (
                                          <img 
                                            src={championIcons[p.championName]}
                                            alt={p.championName}
                                            className="w-8 h-8 rounded"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 bg-muted rounded"></div>
                                        )}
                                        
                                        {/* Rank Icon */}
                                        {p.rankedInfo && (
                                          <img 
                                            src={apiClient.getRankEmblemUrl(p.rankedInfo.tier, p.rankedInfo.rank)}
                                            alt={`${p.rankedInfo.tier} ${p.rankedInfo.rank}`}
                                            className="w-6 h-6"
                                            title={`${p.rankedInfo.tier} ${p.rankedInfo.rank}`}
                                          />
                                        )}
                                        
                                        {/* Player Info */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium truncate" title={`${p.riotIdGameName || p.summonerName}`}>
                                              {p.riotIdGameName || p.summonerName}
                                              {p.rankedInfo ? (
                                                <span className="text-muted-foreground ml-1">
                                                  ({getTierDisplayName(p.rankedInfo.tier)} {getRankDisplayNumber(p.rankedInfo.rank)})
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground ml-1">
                                                  (Lv.{p.summonerLevel || '?'})
                                                </span>
                                              )}
                                            </span>
                                            {isCurrentPlayer && (
                                              <span className="px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                                                YOU
                                              </span>
                                            )}
                                            {/* Summoner Spells */}
                                            <div className="flex gap-0.5">
                                              {summonerSpellIcons[p.summoner1Id] && (
                                                <img 
                                                  src={summonerSpellIcons[p.summoner1Id]}
                                                  alt="Spell 1"
                                                  className="w-4 h-4 rounded"
                                                />
                                              )}
                                              {summonerSpellIcons[p.summoner2Id] && (
                                                <img 
                                                  src={summonerSpellIcons[p.summoner2Id]}
                                                  alt="Spell 2"
                                                  className="w-4 h-4 rounded"
                                                />
                                              )}
                                            </div>
                                            {/* Runes */}
                                            <div className="flex gap-0.5">
                                              {p.perks?.styles?.[0]?.selections?.[0]?.perk && (
                                                <img 
                                                  src={runeIcons[p.perks.styles[0].selections[0].perk] || apiClient.getRuneIconUrl(p.perks.styles[0].selections[0].perk)}
                                                  alt="Main Rune"
                                                  className="w-4 h-4 rounded"
                                                  title={t('summoner.mainRune')}
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                  }}
                                                />
                                              )}
                                              {p.perks?.styles?.[1]?.style && runeIcons[p.perks.styles[1].style] && (
                                                <img 
                                                  src={runeIcons[p.perks.styles[1].style]}
                                                  alt="Sub Rune Style"
                                                  className="w-4 h-4 rounded opacity-70"
                                                  title={t('summoner.subRune')}
                                                />
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Stats */}
                                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                            <span className={cn(
                                              "font-semibold",
                                              kda >= 3 ? "text-green-600 dark:text-green-400" : 
                                              kda >= 2 ? "text-yellow-600 dark:text-yellow-400" : 
                                              "text-red-600 dark:text-red-400"
                                            )}>
                                              {p.kills}/{p.deaths}/{p.assists}
                                            </span>
                                            <span>{((p.totalDamageDealtToChampions || 0) / 1000).toFixed(0)}k dmg</span>
                                            <span>{p.totalMinionsKilled + p.neutralMinionsKilled} CS ({csPerMin}/m)</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Items and Vision Stats */}
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex gap-0.5">
                                          {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                                            const itemId = p[`item${slot}`]
                                            return (
                                              <div key={slot} className="w-4 h-4 bg-muted/50 rounded border border-border">
                                                {itemId && itemId !== 0 && itemId !== '0' ? (
                                                  <ItemTooltip itemId={typeof itemId === 'string' ? parseInt(itemId) : itemId}>
                                                    {itemIcons[itemId] ? (
                                                      <img 
                                                        src={itemIcons[itemId]}
                                                        alt={`Item ${itemId}`}
                                                        className="w-full h-full rounded cursor-help"
                                                      />
                                                    ) : (
                                                      <div className="w-full h-full bg-muted/80 rounded animate-pulse"></div>
                                                    )}
                                                  </ItemTooltip>
                                                ) : null}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        {/* Vision Stats */}
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <span>{p.visionScore || 0} Vision</span>
                                          <span>{t('summoner.wardsPlaced')}: {p.wardsPlaced || 0}</span>
                                          <span>{t('summoner.controlWards')}: {p.visionWardsBoughtInGame || 0}</span>
                                          <span>{t('summoner.wardsKilled')}: {p.wardsKilled || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        </div>
                        
                        {/* Special Rune Tracking (Phase 2 Placeholders) */}
                        {match.participant?.perks?.styles?.some((style: any) => 
                          style.selections?.some((s: any) => s.perk === 8360)
                        ) && (
                          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                              {t('summoner.spellbookSwaps')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Phase 2: Timeline of spellbook changes will be displayed here
                            </div>
                          </div>
                        )}
                        
                        {match.participant?.perks?.styles?.some((style: any) => 
                          style.selections?.some((s: any) => s.perk === 8306)
                        ) && (
                          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                              {t('summoner.hexflashUses')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Phase 2: Hexflash usage count will be displayed here
                            </div>
                          </div>
                        )}

                      {/* Full Match Details Button */}
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/${region}/match/${match.matchId}`, { 
                            state: { 
                              summonerName: summonerData?.name,
                              puuid: summonerData?.puuid
                            } 
                          })}
                          className="w-full md:w-auto"
                        >
                          View Full Match Details →
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">{t('common.notFound')}</p>
          )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  )
}

export default SummonerPage