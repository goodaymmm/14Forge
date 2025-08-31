import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/services/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import FourteenMinAnalysis from '@/components/analysis/FourteenMinAnalysis'
import PlayerFourteenMinAnalysis from '@/components/analysis/PlayerFourteenMinAnalysis'
import PlayerBuildAndRunes from '@/components/analysis/PlayerBuildAndRunes'
import PlayerSkillOrder from '@/components/analysis/PlayerSkillOrder'
import { cn } from '@/lib/utils'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ChampionTooltip from '@/components/game/ChampionTooltip'
import ItemTooltip from '@/components/game/ItemTooltip'
import RuneTooltip from '@/components/game/RuneTooltip'
import SummonerSpellTooltip from '@/components/game/SummonerSpellTooltip'
import LaneMatchupComparison from '@/components/match/LaneMatchupComparison'
// import InvadeAnalysis from '@/components/analysis/InvadeAnalysis'
// import LaneMatchupIndicator from '@/components/match/LaneMatchupIndicator'
import CompactLaneMatchups from '@/components/match/CompactLaneMatchups'
import FourteenCoacher from '@/components/contest/FourteenCoacher'
import { HeatmapContainer } from '@/components/heatmap/HeatmapContainer'
import { MapPin } from 'lucide-react'

const CDN_URL = 'https://ddragon.leagueoflegends.com/cdn/14.23.1'

const MatchPage = () => {
  const { region, matchId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [championIcons, setChampionIcons] = useState<{ [key: string]: string }>({})
  const [itemIcons, setItemIcons] = useState<{ [key: number]: string }>({})
  const [summonerSpellIcons, setSummonerSpellIcons] = useState<{ [key: number]: string }>({})
  const [runeIcons, setRuneIcons] = useState<{ [key: number]: string }>({})
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  // Convert Roman numerals to Arabic numerals for rank display
  const getRankDisplayNumber = (rank: string): string => {
    const rankMap: Record<string, string> = {
      'I': '1',
      'II': '2',
      'III': '3',
      'IV': '4'
    }
    return rankMap[rank] || rank
  }

  // Get puuid from location state
  const puuid = location.state?.puuid
  
  const { data: match, isLoading, error } = useQuery({
    queryKey: ['match', region, matchId, puuid],
    queryFn: () => apiClient.getMatch(region!, matchId!, puuid),
    enabled: !!region && !!matchId,
  })

  const { data: analysis, refetch: refetchAnalysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['14min-analysis', region, matchId],
    queryFn: () => apiClient.getFourteenMinAnalysis(region!, matchId!),
    enabled: false, // Manual execution only
    retry: false,
  })

  // State for localized champion names
  const [localizedChampionNames, setLocalizedChampionNames] = useState<{ [key: string]: string }>({})
  const { i18n } = useTranslation()

  // Load champion and item icons
  useEffect(() => {
    const loadIcons = async () => {
      const participantsList = match?.data?.allParticipants || match?.data?.info?.participants
      if (!participantsList) return

      try {
        // Collect unique champion names
        const uniqueChampions = [...new Set(
          participantsList
            .filter((p: any) => p.championName)
            .map((p: any) => p.championName)
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

        const championResults = await Promise.all(championPromises)
        const newChampionIcons = championResults.filter(Boolean).reduce((acc, curr) => ({ ...acc, ...curr }), {})
        if (Object.keys(newChampionIcons).length > 0) {
          setChampionIcons(prev => ({ ...prev, ...newChampionIcons }))
        }

        // Load localized champion names
        const namePromises = uniqueChampions.map(async (championName) => {
          try {
            const localizedName = await apiClient.getLocalizedChampionName(championName, i18n.language)
            return { [championName]: localizedName }
          } catch (err) {
            console.error(`Failed to load localized name for ${championName}:`, err)
            return { [championName]: championName }
          }
        })

        const nameResults = await Promise.all(namePromises)
        const newLocalizedNames = nameResults.reduce((acc, curr) => ({ ...acc, ...curr }), {})
        setLocalizedChampionNames(newLocalizedNames)

        // Collect unique item IDs
        const uniqueItems = [...new Set(
          participantsList.flatMap((p: any) => [
            p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6
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

        // Collect unique summoner spell IDs
        const uniqueSpells = [...new Set(
          participantsList.flatMap((p: any) => [p.summoner1Id, p.summoner2Id].filter(Boolean))
        )]

        // Load summoner spell icons
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

        // Collect unique rune IDs (all runes and stat shards)
        const uniqueRunes = [...new Set(
          participantsList
            .flatMap((p: any) => {
              const runes = []
              // Primary runes
              if (p.perks?.styles?.[0]?.selections) {
                p.perks.styles[0].selections.forEach((s: any) => {
                  if (s.perk) runes.push({ id: s.perk, type: 'rune' })
                })
              }
              // Secondary runes
              if (p.perks?.styles?.[1]?.selections) {
                p.perks.styles[1].selections.forEach((s: any) => {
                  if (s.perk) runes.push({ id: s.perk, type: 'rune' })
                })
              }
              // Stat shards
              if (p.perks?.statPerks) {
                if (p.perks.statPerks.offense) runes.push({ id: p.perks.statPerks.offense, type: 'rune' })
                if (p.perks.statPerks.flex) runes.push({ id: p.perks.statPerks.flex, type: 'rune' })
                if (p.perks.statPerks.defense) runes.push({ id: p.perks.statPerks.defense, type: 'rune' })
              }
              // Style icons
              if (p.perks?.styles?.[0]?.style) {
                runes.push({ id: p.perks.styles[0].style, type: 'style' })
              }
              if (p.perks?.styles?.[1]?.style) {
                runes.push({ id: p.perks.styles[1].style, type: 'style' })
              }
              return runes
            })
            .filter(Boolean)
        )]

        // Load rune and style icons
        console.log('[Runes] Loading rune icons for:', uniqueRunes)
        const runePromises = uniqueRunes.map(async (runeData) => {
          if (!runeIcons[runeData.id]) {
            try {
              const url = runeData.type === 'style' 
                ? await apiClient.getRuneStyleIconUrl(runeData.id)
                : await apiClient.getRuneIconUrl(runeData.id)
              console.log(`[Runes] Loaded ${runeData.type} icon for ${runeData.id}:`, url)
              return { [runeData.id]: url }
            } catch (err) {
              console.error(`Failed to load ${runeData.type} icon for ${runeData.id}:`, err)
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
      } catch (error) {
        console.error('Error loading icons:', error)
      }
    }

    loadIcons()
  }, [match?.data?.allParticipants, match?.data?.info?.participants, i18n.language])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Match Not Found</CardTitle>
            <CardDescription>
              Unable to load match data for ID: {matchId}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const matchData = match?.data
  // Handle both formatted (with allParticipants) and raw match data
  const isFormattedData = !!matchData?.allParticipants
  const gameInfo = isFormattedData ? matchData : matchData?.info
  const metadata = matchData?.metadata || matchData?.matchId

  // Calculate game duration properly (handle both formats)
  const gameDuration = isFormattedData ? gameInfo?.gameDuration : gameInfo?.gameDuration
  const gameDurationMinutes = gameDuration ? Math.floor(gameDuration / 60) : 0
  const gameDurationSeconds = gameDuration ? gameDuration % 60 : 0
  
  // Get game creation time (handle both formats)
  const gameCreation = isFormattedData ? gameInfo?.gameCreation : gameInfo?.gameCreation

  // Get teams
  // Get participants list based on data format
  const participants = isFormattedData ? matchData?.allParticipants : gameInfo?.participants
  
  // Debug: Check data structure
  if (participants && participants.length > 0) {
    console.log('[MatchPage] First participant check:', {
      participantId: participants[0].participantId,
      puuid: participants[0].puuid?.substring(0, 20),
      hasParticipantId: 'participantId' in participants[0],
      type: typeof participants[0].participantId
    })
  }
  if (isFormattedData && matchData) {
    console.log('[MatchPage] Match data structure:', {
      mainParticipant: matchData.participant,
      firstParticipant: matchData.allParticipants?.[0]
    })
  }
  
  // Get teams - for formatted data, use teams from backend or teamStats
  const teams = matchData?.teams // Get teams data from backend
  const teamStats = matchData?.teamStats // Get teamStats for formatted data
  
  const blueTeam = isFormattedData 
    ? { 
        teamId: 100, 
        participants: participants?.filter((p: any) => p.teamId === 100),
        win: teamStats?.teamId === 100 ? teamStats?.win : participants?.find((p: any) => p.teamId === 100)?.win,
        objectives: teams?.find((t: any) => t.teamId === 100)?.objectives || {
          champion: { kills: teamStats?.teamId === 100 ? participants?.filter((p: any) => p.teamId === 100).reduce((sum: number, p: any) => sum + (p.kills || 0), 0) : 0 },
          tower: { kills: teams?.find((t: any) => t.teamId === 100)?.objectives?.tower?.kills || 0 },
          dragon: { kills: teams?.find((t: any) => t.teamId === 100)?.objectives?.dragon?.kills || 0 },
          baron: { kills: teams?.find((t: any) => t.teamId === 100)?.objectives?.baron?.kills || 0 }
        }
      }
    : gameInfo?.teams?.find((t: any) => t.teamId === 100)
  
  const redTeam = isFormattedData
    ? { 
        teamId: 200, 
        participants: participants?.filter((p: any) => p.teamId === 200),
        win: teamStats?.teamId === 200 ? teamStats?.win : participants?.find((p: any) => p.teamId === 200)?.win,
        objectives: teams?.find((t: any) => t.teamId === 200)?.objectives || {
          champion: { kills: teamStats?.teamId === 200 ? participants?.filter((p: any) => p.teamId === 200).reduce((sum: number, p: any) => sum + (p.kills || 0), 0) : 0 },
          tower: { kills: teams?.find((t: any) => t.teamId === 200)?.objectives?.tower?.kills || 0 },
          dragon: { kills: teams?.find((t: any) => t.teamId === 200)?.objectives?.dragon?.kills || 0 },
          baron: { kills: teams?.find((t: any) => t.teamId === 200)?.objectives?.baron?.kills || 0 }
        }
      }
    : gameInfo?.teams?.find((t: any) => t.teamId === 200)

  // Get queue name
  const getQueueName = (queueId: number) => {
    switch(queueId) {
      case 420: return t('summoner.rankedSoloDuo')
      case 440: return t('summoner.rankedFlex')
      case 430: return 'Normal (Blind)'
      case 400: return 'Normal (Draft)'
      case 450: return 'ARAM'
      default: return 'Other'
    }
  }

  // Fix position display (UTILITY -> SUPPORT) and abbreviate
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

  // Sort participants by position
  const sortByPosition = (participants: any[]) => {
    const posOrder: { [key: string]: number } = { 
      'TOP': 0, 
      'JUNGLE': 1, 
      'MIDDLE': 2, 
      'BOTTOM': 3, 
      'UTILITY': 4 
    }
    return participants.sort((a, b) => 
      (posOrder[a.individualPosition] ?? 5) - (posOrder[b.individualPosition] ?? 5)
    )
  }

  // Get current summoner from navigation state or URL
  const currentSummonerName = location.state?.summonerName || ''
  const currentSummonerNameLower = currentSummonerName.toLowerCase().trim()

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Match Overview - Always visible */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('summoner.matchDetails')}</CardTitle>
          <CardDescription className="text-xs">
            Match ID: {matchId} • {gameCreation ? new Date(gameCreation).toLocaleString() : 'Unknown Date'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t('match.gameMode')}</p>
              <p className="font-medium">{gameInfo?.gameMode === 'CLASSIC' ? t('match.summonersRift') : (gameInfo?.gameMode || 'Unknown')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('match.gameDuration')}</p>
              <p className="font-medium">
                {gameDurationMinutes}:{String(gameDurationSeconds).padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Queue Type</p>
              <p className="font-medium">{getQueueName(gameInfo?.queueId)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('match.patch')}</p>
              <p className="font-medium">{(matchData?.gameVersion || gameInfo?.gameVersion) ? (matchData?.gameVersion || gameInfo?.gameVersion).split('.').slice(0, 2).join('.') : 'Unknown'}</p>
            </div>
          </div>

          {/* Team Overview */}
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div className={cn(
              "p-3 rounded-lg border",
              blueTeam?.win ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500" : "bg-gray-50 dark:bg-gray-900/20 border-gray-300"
            )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">{t('summoner.blueTeam')}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1",
                  blueTeam?.win ? "bg-blue-600 text-white" : "bg-gray-400 text-white"
                )}>
                  {blueTeam?.win && <span>👑</span>}
                  {blueTeam?.win ? t('summoner.victory') : t('summoner.defeat')}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5 text-xs">
                <span>Kills: {blueTeam?.objectives?.champion?.kills || 0}</span>
                <span>Towers: {blueTeam?.objectives?.tower?.kills || 0}</span>
                <span>Dragons: {blueTeam?.objectives?.dragon?.kills || 0}</span>
                <span>Barons: {blueTeam?.objectives?.baron?.kills || 0}</span>
              </div>
            </div>
            <div className={cn(
              "p-3 rounded-lg border",
              redTeam?.win ? "bg-red-50 dark:bg-red-900/20 border-red-500" : "bg-gray-50 dark:bg-gray-900/20 border-gray-300"
            )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-red-600 dark:text-red-400">{t('summoner.redTeam')}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1",
                  redTeam?.win ? "bg-red-600 text-white" : "bg-gray-400 text-white"
                )}>
                  {redTeam?.win && <span>👑</span>}
                  {redTeam?.win ? t('summoner.victory') : t('summoner.defeat')}
                </span>
              </div>
              <div className="flex gap-3 mt-1.5 text-xs">
                <span>Kills: {redTeam?.objectives?.champion?.kills || 0}</span>
                <span>Towers: {redTeam?.objectives?.tower?.kills || 0}</span>
                <span>Dragons: {redTeam?.objectives?.dragon?.kills || 0}</span>
                <span>Barons: {redTeam?.objectives?.baron?.kills || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 14-Minute Team Analysis (Ranked Only - Auto-execute) */}
      {gameInfo?.queueId === 420 && (
        <FourteenMinAnalysis 
          matchId={matchId!}
          region={region!}
          analysis={analysis?.data}
          onAnalyze={() => refetchAnalysis()}
          isLoading={isAnalysisLoading}
          participants={participants}
          gameDuration={gameDuration}
        />
      )}

      {/* Side-by-Side Team Scoreboard with Lane Matchups */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('summoner.scoreboard')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-4 p-3">
            {/* Blue Team */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                  {t('summoner.blueTeam')}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1",
                  blueTeam?.win ? "bg-blue-600 text-white" : "bg-gray-400 text-white"
                )}>
                  {blueTeam?.win && <span>👑</span>}
                  {blueTeam?.win ? t('summoner.victory') : t('summoner.defeat')}
                </span>
              </div>
              <div className="space-y-2">
                {sortByPosition(participants?.filter((p: any) => p.teamId === 100) || [])
                  .map((participant: any) => {
                    const kda = participant.deaths === 0 
                      ? participant.kills + participant.assists 
                      : ((participant.kills + participant.assists) / participant.deaths)
                    const isCurrentSummoner = (participant.riotIdGameName?.toLowerCase().trim() === currentSummonerNameLower) || (participant.summonerName?.toLowerCase().trim() === currentSummonerNameLower)
                    
                    return (
                      <div 
                        key={participant.puuid}
                        className={cn(
                          "p-2 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                          participant.win 
                            ? "bg-green-50/50 dark:bg-green-900/20 border-green-500/50" 
                            : "bg-gray-50/50 dark:bg-gray-900/10 border-gray-300/50",
                          selectedPlayer === participant.puuid && "ring-2 ring-purple-500 shadow-lg",
                          isCurrentSummoner && participant.win && "ring-2 ring-green-400 shadow-green-400/20",
                          isCurrentSummoner && !participant.win && "ring-2 ring-gray-400 shadow-gray-400/20"
                        )}
                        onClick={() => setSelectedPlayer(participant.puuid)}
                      >
                        <div className="flex items-center gap-2">
                          {/* Position & Champion */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {getPositionDisplay(participant.individualPosition)}
                            </span>
                            <ChampionTooltip 
                              championName={participant.championName}
                              localizedName={localizedChampionNames[participant.championName]}
                            >
                              {championIcons[participant.championName] ? (
                                <img 
                                  src={championIcons[participant.championName]}
                                  alt={participant.championName}
                                  className="w-10 h-10 rounded cursor-help"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded"></div>
                              )}
                            </ChampionTooltip>
                          </div>
                          
                          {/* Summoner Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">
                                {participant.riotIdGameName || participant.summonerName || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Lv.{participant.champLevel || participant.summonerLevel || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {/* Summoner Spells */}
                              <div className="flex gap-0.5">
                                <SummonerSpellTooltip spellId={participant.summoner1Id}>
                                  {summonerSpellIcons[participant.summoner1Id] ? (
                                    <img 
                                      src={summonerSpellIcons[participant.summoner1Id]}
                                      alt="Spell 1"
                                      className="w-5 h-5 rounded cursor-help"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-muted rounded"></div>
                                  )}
                                </SummonerSpellTooltip>
                                <SummonerSpellTooltip spellId={participant.summoner2Id}>
                                  {summonerSpellIcons[participant.summoner2Id] ? (
                                    <img 
                                      src={summonerSpellIcons[participant.summoner2Id]}
                                      alt="Spell 2"
                                      className="w-5 h-5 rounded cursor-help"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-muted rounded"></div>
                                  )}
                                </SummonerSpellTooltip>
                              </div>
                              {/* Runes */}
                              <div className="flex gap-0.5">
                                {/* Main Rune */}
                                {participant.perks?.styles?.[0]?.selections?.[0]?.perk && (
                                  <RuneTooltip runeId={participant.perks.styles[0].selections[0].perk}>
                                    {runeIcons[participant.perks.styles[0].selections[0].perk] ? (
                                      <img 
                                        src={runeIcons[participant.perks.styles[0].selections[0].perk]}
                                        alt="Keystone"
                                        className="w-5 h-5 rounded-full cursor-help"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 bg-muted rounded-full"></div>
                                    )}
                                  </RuneTooltip>
                                )}
                                {/* Sub Rune Style */}
                                {participant.perks?.styles?.[1]?.style && runeIcons[participant.perks.styles[1].style] && (
                                  <img 
                                    src={runeIcons[participant.perks.styles[1].style]}
                                    alt="Sub Rune Style"
                                    className="w-5 h-5 rounded-full cursor-help opacity-70"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-3">
                            {/* KDA */}
                            <div className="text-center min-w-[70px]">
                              <div className={cn(
                                "text-sm font-bold",
                                kda >= 3 ? "text-green-600 dark:text-green-400" : 
                                kda >= 2 ? "text-yellow-600 dark:text-yellow-400" : 
                                "text-red-600 dark:text-red-400"
                              )}>
                                {participant.kills}/{participant.deaths}/{participant.assists}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {kda.toFixed(2)} KDA
                              </div>
                            </div>
                            
                            {/* CS */}
                            <div className="text-center min-w-[70px]">
                              <div className="text-sm font-semibold">
                                {participant.totalMinionsKilled + participant.neutralMinionsKilled}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {((participant.totalMinionsKilled + participant.neutralMinionsKilled) / (gameDurationMinutes || 1)).toFixed(1)} CS/m
                              </div>
                            </div>
                            
                            {/* Gold */}
                            <div className="text-center min-w-[50px]">
                              <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                                {((participant.goldEarned || participant.gold || 0) / 1000).toFixed(1)}k
                              </div>
                              <div className="text-xs text-muted-foreground">Gold</div>
                            </div>
                            
                            {/* Damage */}
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {(participant.totalDamageDealtToChampions / 1000).toFixed(1)}k
                              </div>
                              <div className="text-xs text-muted-foreground">Damage</div>
                            </div>
                            
                            {/* Rank or Level */}
                            {participant.rankedInfo ? (
                              <div className="flex items-center gap-1">
                                <img 
                                  src={apiClient.getRankEmblemUrl(participant.rankedInfo.tier)}
                                  alt={participant.rankedInfo.tier}
                                  className="w-10 h-10 object-contain"
                                />
                                <span className="text-xs font-medium">
                                  {participant.rankedInfo.tier.charAt(0).toUpperCase() + participant.rankedInfo.tier.slice(1).toLowerCase()} {getRankDisplayNumber(participant.rankedInfo.rank)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Lv.{participant.champLevel || participant.summonerLevel || 'N/A'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Items and Vision Stats Row */}
                        <div className="flex items-center mt-2">
                          {/* Items */}
                          <div className="flex gap-0.5">
                            {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                              const itemId = participant[`item${slot}`]
                              return (
                                <div key={slot} className="w-6 h-6 bg-muted/50 rounded border border-border">
                                  {itemId && itemId !== 0 ? (
                                    <ItemTooltip itemId={itemId}>
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
                                  ) : (
                                    <img 
                                      src={apiClient.getEmptyItemSlotUrl()}
                                      alt="Empty slot"
                                      className="w-full h-full rounded opacity-30"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Vision Stats - aligned with KDA */}
                          <div className="flex items-center gap-2 ml-20">
                            {/* Vision Score */}
                            <div className="text-center">
                              <div className="text-sm font-semibold">
                                {participant.visionScore}
                              </div>
                              <div className="text-xs text-muted-foreground">Vision</div>
                            </div>
                            
                            {/* Ward Statistics */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">{t('summoner.wardsPlaced')}: {participant.wardsPlaced || 0}</span>
                              <span className="text-muted-foreground">{t('summoner.controlWards')}: {participant.visionWardsBoughtInGame || 0}</span>
                              <span className="text-muted-foreground">{t('summoner.wardsKilled')}: {participant.wardsKilled || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
            
            {/* Red Team */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-red-600 dark:text-red-400">
                  {t('summoner.redTeam')}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1",
                  redTeam?.win ? "bg-red-600 text-white" : "bg-gray-400 text-white"
                )}>
                  {redTeam?.win && <span>👑</span>}
                  {redTeam?.win ? t('summoner.victory') : t('summoner.defeat')}
                </span>
              </div>
              <div className="space-y-2">
                {sortByPosition(participants?.filter((p: any) => p.teamId === 200) || [])
                  .map((participant: any) => {
                    const kda = participant.deaths === 0 
                      ? participant.kills + participant.assists 
                      : ((participant.kills + participant.assists) / participant.deaths)
                    const isCurrentSummoner = (participant.riotIdGameName?.toLowerCase().trim() === currentSummonerNameLower) || (participant.summonerName?.toLowerCase().trim() === currentSummonerNameLower)
                    
                    return (
                      <div 
                        key={participant.puuid}
                        className={cn(
                          "p-2 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                          participant.win 
                            ? "bg-green-50/50 dark:bg-green-900/20 border-green-500/50" 
                            : "bg-gray-50/50 dark:bg-gray-900/10 border-gray-300/50",
                          selectedPlayer === participant.puuid && "ring-2 ring-purple-500 shadow-lg",
                          isCurrentSummoner && participant.win && "ring-2 ring-green-400 shadow-green-400/20",
                          isCurrentSummoner && !participant.win && "ring-2 ring-gray-400 shadow-gray-400/20"
                        )}
                        onClick={() => setSelectedPlayer(participant.puuid)}
                      >
                        <div className="flex items-center gap-2">
                          {/* Position & Champion */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-sm font-semibold text-muted-foreground w-8">
                              {getPositionDisplay(participant.individualPosition)}
                            </span>
                            <ChampionTooltip 
                              championName={participant.championName}
                              localizedName={localizedChampionNames[participant.championName]}
                            >
                              {championIcons[participant.championName] ? (
                                <img 
                                  src={championIcons[participant.championName]}
                                  alt={participant.championName}
                                  className="w-10 h-10 rounded cursor-help"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-muted rounded"></div>
                              )}
                            </ChampionTooltip>
                          </div>
                          
                          {/* Summoner Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">
                                {participant.riotIdGameName || participant.summonerName || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Lv.{participant.champLevel || participant.summonerLevel || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {/* Summoner Spells */}
                              <div className="flex gap-0.5">
                                <SummonerSpellTooltip spellId={participant.summoner1Id}>
                                  {summonerSpellIcons[participant.summoner1Id] ? (
                                    <img 
                                      src={summonerSpellIcons[participant.summoner1Id]}
                                      alt="Spell 1"
                                      className="w-5 h-5 rounded cursor-help"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-muted rounded"></div>
                                  )}
                                </SummonerSpellTooltip>
                                <SummonerSpellTooltip spellId={participant.summoner2Id}>
                                  {summonerSpellIcons[participant.summoner2Id] ? (
                                    <img 
                                      src={summonerSpellIcons[participant.summoner2Id]}
                                      alt="Spell 2"
                                      className="w-5 h-5 rounded cursor-help"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-muted rounded"></div>
                                  )}
                                </SummonerSpellTooltip>
                              </div>
                              {/* Runes */}
                              <div className="flex gap-0.5">
                                {/* Main Rune */}
                                {participant.perks?.styles?.[0]?.selections?.[0]?.perk && (
                                  <RuneTooltip runeId={participant.perks.styles[0].selections[0].perk}>
                                    {runeIcons[participant.perks.styles[0].selections[0].perk] ? (
                                      <img 
                                        src={runeIcons[participant.perks.styles[0].selections[0].perk]}
                                        alt="Keystone"
                                        className="w-5 h-5 rounded-full cursor-help"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 bg-muted rounded-full"></div>
                                    )}
                                  </RuneTooltip>
                                )}
                                {/* Sub Rune Style */}
                                {participant.perks?.styles?.[1]?.style && runeIcons[participant.perks.styles[1].style] && (
                                  <img 
                                    src={runeIcons[participant.perks.styles[1].style]}
                                    alt="Sub Rune Style"
                                    className="w-5 h-5 rounded-full cursor-help opacity-70"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Stats */}
                          <div className="flex items-center gap-3">
                            {/* KDA */}
                            <div className="text-center min-w-[70px]">
                              <div className={cn(
                                "text-sm font-bold",
                                kda >= 3 ? "text-green-600 dark:text-green-400" : 
                                kda >= 2 ? "text-yellow-600 dark:text-yellow-400" : 
                                "text-red-600 dark:text-red-400"
                              )}>
                                {participant.kills}/{participant.deaths}/{participant.assists}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {kda.toFixed(2)} KDA
                              </div>
                            </div>
                            
                            {/* CS */}
                            <div className="text-center min-w-[70px]">
                              <div className="text-sm font-semibold">
                                {participant.totalMinionsKilled + participant.neutralMinionsKilled}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {((participant.totalMinionsKilled + participant.neutralMinionsKilled) / (gameDurationMinutes || 1)).toFixed(1)} CS/m
                              </div>
                            </div>
                            
                            {/* Gold */}
                            <div className="text-center min-w-[50px]">
                              <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                                {((participant.goldEarned || participant.gold || 0) / 1000).toFixed(1)}k
                              </div>
                              <div className="text-xs text-muted-foreground">Gold</div>
                            </div>
                            
                            {/* Damage */}
                            <div className="text-center min-w-[60px]">
                              <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {(participant.totalDamageDealtToChampions / 1000).toFixed(1)}k
                              </div>
                              <div className="text-xs text-muted-foreground">Damage</div>
                            </div>
                            
                            {/* Rank or Level */}
                            {participant.rankedInfo ? (
                              <div className="flex items-center gap-1">
                                <img 
                                  src={apiClient.getRankEmblemUrl(participant.rankedInfo.tier)}
                                  alt={participant.rankedInfo.tier}
                                  className="w-10 h-10 object-contain"
                                />
                                <span className="text-xs font-medium">
                                  {participant.rankedInfo.tier.charAt(0).toUpperCase() + participant.rankedInfo.tier.slice(1).toLowerCase()} {getRankDisplayNumber(participant.rankedInfo.rank)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Lv.{participant.champLevel || participant.summonerLevel || 'N/A'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Items and Vision Stats Row */}
                        <div className="flex items-center mt-2">
                          {/* Items */}
                          <div className="flex gap-0.5">
                            {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                              const itemId = participant[`item${slot}`]
                              return (
                                <div key={slot} className="w-6 h-6 bg-muted/50 rounded border border-border">
                                  {itemId && itemId !== 0 ? (
                                    <ItemTooltip itemId={itemId}>
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
                                  ) : (
                                    <img 
                                      src={apiClient.getEmptyItemSlotUrl()}
                                      alt="Empty slot"
                                      className="w-full h-full rounded opacity-30"
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Vision Stats - aligned with KDA */}
                          <div className="flex items-center gap-2 ml-20">
                            {/* Vision Score */}
                            <div className="text-center">
                              <div className="text-sm font-semibold">
                                {participant.visionScore}
                              </div>
                              <div className="text-xs text-muted-foreground">Vision</div>
                            </div>
                            
                            {/* Ward Statistics */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">{t('summoner.wardsPlaced')}: {participant.wardsPlaced || 0}</span>
                              <span className="text-muted-foreground">{t('summoner.controlWards')}: {participant.visionWardsBoughtInGame || 0}</span>
                              <span className="text-muted-foreground">{t('summoner.wardsKilled')}: {participant.wardsKilled || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
          
          {/* Compact Lane Matchups - At bottom of scoreboard */}
          {participants && (
            <CompactLaneMatchups participants={participants} />
          )}
        </CardContent>
      </Card>

      {/* Selected Player vs Opponent Comparison */}
      {selectedPlayer && (() => {
        const player = participants?.find((p: any) => p.puuid === selectedPlayer)
        if (!player) return null
        
        // Debug: Check player data structure
        console.log('[MatchPage] Selected player participantId:', player.participantId, 'type:', typeof player.participantId)
        console.log('[MatchPage] Selected player object:', {
          puuid: player.puuid,
          participantId: player.participantId,
          summonerName: player.summonerName || player.riotIdGameName,
          championName: player.championName
        })
        console.log('[MatchPage] Player data:', JSON.stringify({
          champLevel: player.champLevel,
          summonerLevel: player.summonerLevel,
          totalHealsOnTeammates: player.totalHealsOnTeammates,
          totalDamageShieldedOnTeammates: player.totalDamageShieldedOnTeammates,
          timeCCingOthers: player.timeCCingOthers,
          allInPings: player.allInPings,
          assistMePings: player.assistMePings,
          dangerPings: player.dangerPings,
          enemyMissingPings: player.enemyMissingPings,
          onMyWayPings: player.onMyWayPings,
          pushPings: player.pushPings,
          holdPings: player.holdPings,
          needVisionPings: player.needVisionPings,
          perks: player.perks
        }, null, 2))
        
        // Find opponent in same position on the opposite team
        const opponent = participants?.find((p: any) => 
          p.teamId !== player.teamId && 
          p.individualPosition === player.individualPosition
        )
        
        // Helper component for player stats
        const PlayerComparisonStats = ({ player, championIcon, localizedName, teamColor }: any) => {
          const playerStats = [
            { label: 'KDA', value: `${player.kills}/${player.deaths}/${player.assists}` },
            { label: 'CS', value: player.totalMinionsKilled + player.neutralMinionsKilled },
            { label: 'CS/m', value: ((player.totalMinionsKilled + player.neutralMinionsKilled) / (gameDurationMinutes || 1)).toFixed(1) },
            { label: 'Damage', value: `${(player.totalDamageDealtToChampions / 1000).toFixed(1)}k` },
            { label: 'Gold', value: `${((player.goldEarned || player.gold || 0) / 1000).toFixed(1)}k` },
            { label: 'Vision', value: player.visionScore }
          ]
          
          return (
            <div className="space-y-3">
              <div className={cn(
                "flex items-center gap-3 pb-3 border-b",
                teamColor === 'blue' ? "border-blue-800/30" : "border-red-800/30"
              )}>
                {championIcon && (
                  <img src={championIcon} alt={player.championName} className="w-12 h-12 rounded" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{player.riotIdGameName || player.summonerName || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{localizedName || player.championName}</div>
                </div>
                {player.win && (
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-bold",
                    teamColor === 'blue' ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                  )}>
                    {t('summoner.victory').toUpperCase()}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {playerStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className={cn(
                      "text-sm font-semibold",
                      player.win ? "text-green-500" : ""
                    )}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Items */}
              <div className="pt-3 border-t border-border/50">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
                    const itemId = player[`item${slot}`]
                    return (
                      <div key={slot} className="w-8 h-8 bg-muted/50 rounded border border-border">
                        {itemId && itemId !== 0 && itemIcons[itemId] ? (
                          <ItemTooltip itemId={itemId}>
                            <img 
                              src={itemIcons[itemId]}
                              alt={`Item ${itemId}`}
                              className="w-full h-full rounded cursor-help"
                            />
                          </ItemTooltip>
                        ) : (
                          <img 
                            src={apiClient.getEmptyItemSlotUrl()}
                            alt="Empty slot"
                            className="w-full h-full rounded opacity-30"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        }
        
        // Calculate team stats properly
        const playerTeamStats = {
          totalKills: (participants || [])
            .filter((p: any) => p.teamId === player.teamId)
            .reduce((sum: number, p: any) => sum + (p.kills || 0), 0),
          totalDamage: (participants || [])
            .filter((p: any) => p.teamId === player.teamId)
            .reduce((sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0), 0)
        }
        
        const opponentTeamStats = opponent ? {
          totalKills: (participants || [])
            .filter((p: any) => p.teamId === opponent.teamId)
            .reduce((sum: number, p: any) => sum + (p.kills || 0), 0),
          totalDamage: (participants || [])
            .filter((p: any) => p.teamId === opponent.teamId)
            .reduce((sum: number, p: any) => sum + (p.totalDamageDealtToChampions || 0), 0)
        } : undefined

        return (
          <>
          <div className={opponent ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}>
            {/* Left Column: Lane Matchup Comparison */}
            {opponent && (
              <Card className="overflow-hidden h-fit">
                <CardContent className="p-0">
                  <LaneMatchupComparison
                    player={{
                      ...player,
                      championIcon: championIcons[player.championName]
                    }}
                    opponent={{
                      ...opponent,
                      championIcon: championIcons[opponent.championName]
                    }}
                    gameDurationMinutes={gameDurationMinutes}
                    playerTeamStats={playerTeamStats}
                    opponentTeamStats={opponentTeamStats}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Right Column: Selected Player Details */}
            {player && (
              <Card className={!opponent ? "mb-4" : "h-fit"}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{t('summoner.playerDetails')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlayer(null)}
                      className="text-xs"
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Player Header */}
                    <div className="flex items-center gap-3 pb-3 border-b">
                      {championIcons[player.championName] ? (
                      <img 
                        src={championIcons[player.championName]}
                        alt={player.championName}
                        className="w-12 h-12 rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded"></div>
                    )}
                    <div>
                      <div className="font-semibold">{player.riotIdGameName || player.summonerName || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">
                        {localizedChampionNames[player.championName] || player.championName} - Level {player.champLevel || 18}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/${region}/summoner/${player.riotIdGameName || player.summonerName}`)}
                      className="ml-auto"
                    >
                      View Profile →
                    </Button>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Combat Stats */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('summoner.combatStats')}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.damageDealt')}:</span>
                          <span>{(player.totalDamageDealtToChampions || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.damageTaken')}:</span>
                          <span>{(player.totalDamageTaken || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('fourteenMin.healing')}:</span>
                          <span>{(player.totalHealsOnTeammates || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('fourteenMin.shielding')}:</span>
                          <span>{(player.totalDamageShieldedOnTeammates || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('fourteenMin.ccTime')}:</span>
                          <span>{Math.round(player.timeCCingOthers || 0)}s</span>
                        </div>
                      </div>
                    </div>

                    {/* Vision Stats */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">{t('fourteenMin.visionControl')}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.visionScore')}:</span>
                          <span>{player.visionScore || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.wardsPlaced')}:</span>
                          <span>{player.wardsPlaced || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.wardsKilled')}:</span>
                          <span>{player.wardsKilled || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.controlWards')}:</span>
                          <span>{player.visionWardsBoughtInGame || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* CS & Gold Stats */}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Economy</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('summoner.goldEarned')}:</span>
                          <span>{(player.goldEarned || player.gold || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total CS:</span>
                          <span>{player.totalMinionsKilled + player.neutralMinionsKilled}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CS/min:</span>
                          <span>{((player.totalMinionsKilled + player.neutralMinionsKilled) / (gameDurationMinutes || 1)).toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 14-Minute Player Performance */}
                  {gameInfo?.queueId === 420 && (
                    <PlayerFourteenMinAnalysis 
                      participant={player}
                      analysis={analysis?.data}
                      onAnalyze={() => refetchAnalysis()}
                      isLoading={isAnalysisLoading}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
        </div>
        
        {/* Build & Statistics Section - Grid Layout */}
        {player && (
          <>
            {/* Two Column Layout for Build/Runes and AI Coach */}
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              {/* Left: Build & Runes and Skill Order */}
              <div className="space-y-4">
                <PlayerBuildAndRunes 
                  player={player}
                  runeIcons={runeIcons}
                />
                <PlayerSkillOrder player={player} />
              </div>
              
              {/* Right: AI Coacher, Item Timeline and Ping Statistics */}
              <div className="space-y-4">
              
              {/* AI Coach Personal Analysis */}
              {gameInfo?.queueId === 420 && (() => {
                // Get selected player or current player
                const coachPlayer = selectedPlayer 
                  ? participants?.find((p: any) => p.puuid === selectedPlayer)
                  : player;
                
                if (!coachPlayer) return null;
                
                return (
                  <FourteenCoacher
                    key={`${matchId}-${coachPlayer.puuid}`} // Force re-render on player change
                    matchId={matchId!}
                    region={region!}
                    participants={participants}
                    summonerName={coachPlayer.summonerName || coachPlayer.riotIdGameName}
                    champion={coachPlayer.championName}
                    role={coachPlayer.teamPosition || coachPlayer.individualPosition || 'UNKNOWN'}
                    onClose={() => {}}
                  />
                );
              })()}
              
              {/* Item Timeline Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('match.itemTimeline')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {player.itemTimeline && player.itemTimeline.length > 0 ? (
                      (() => {
                        // Group items by minute
                        const itemsByMinute = player.itemTimeline.reduce((acc: any, purchase: any) => {
                          if (!acc[purchase.minute]) {
                            acc[purchase.minute] = [];
                          }
                          acc[purchase.minute].push(purchase);
                          return acc;
                        }, {});
                        
                        // Sort minutes
                        const sortedMinutes = Object.keys(itemsByMinute).map(Number).sort((a, b) => a - b);
                        
                        return (
                          <div className="flex items-center gap-3 flex-wrap">
                            {sortedMinutes.map((minute, idx) => {
                              // Count duplicate items in this minute
                              const itemCounts: Record<number, number> = {};
                              itemsByMinute[minute].forEach((purchase: any) => {
                                itemCounts[purchase.itemId] = (itemCounts[purchase.itemId] || 0) + 1;
                              });
                              
                              // Create unique items list
                              const uniqueItems = Object.keys(itemCounts).map(Number);
                              
                              return (
                                <React.Fragment key={minute}>
                                  {/* Minute group */}
                                  <div className="flex items-center gap-1">
                                    {uniqueItems.map((itemId) => (
                                      <div key={`${minute}-${itemId}`} className="flex flex-col items-center relative">
                                        <ItemTooltip itemId={itemId}>
                                          <div className="relative">
                                            <img
                                              src={`${CDN_URL}/img/item/${itemId}.png`}
                                              alt=""
                                              className="w-7 h-7 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                            {itemCounts[itemId] > 1 && (
                                              <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {itemCounts[itemId]}
                                              </span>
                                            )}
                                          </div>
                                        </ItemTooltip>
                                        <span className="text-[9px] text-muted-foreground mt-0.5">{minute}'</span>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Arrow separator (except for last group) */}
                                  {idx < sortedMinutes.length - 1 && (
                                    <span className="text-gray-400 text-sm">›</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : (
                      // Fallback to final items if timeline not available
                      [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5, player.item6]
                        .filter(item => item && item !== 0)
                        .map((itemId, index) => (
                          <div key={index} className="flex flex-col items-center min-w-[42px]">
                            <ItemTooltip itemId={itemId}>
                              <img
                                src={`${CDN_URL}/img/item/${itemId}.png`}
                                alt=""
                                className="w-8 h-8 rounded border border-gray-600 hover:border-gray-400 transition-colors"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            </ItemTooltip>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {t('match.finalItem')}
                            </div>
                          </div>
                        ))
                    )}
                    {(!player.itemTimeline || player.itemTimeline.length === 0) && 
                     (!player.item0 && !player.item1 && !player.item2) && (
                      <div className="text-xs text-muted-foreground">{t('match.noItems')}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Ping Statistics Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('match.pingStatistics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Basic Pings */}
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">{t('match.pings.basic')}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'allInPings', label: t('match.pings.allIn'), value: player?.allInPings },
                          { key: 'assistMePings', label: t('match.pings.assistMe'), value: player?.assistMePings },
                          { key: 'dangerPings', label: t('match.pings.danger'), value: player?.dangerPings },
                          { key: 'enemyMissingPings', label: t('match.pings.enemyMissing'), value: player?.enemyMissingPings },
                          { key: 'onMyWayPings', label: t('match.pings.onMyWay'), value: player?.onMyWayPings },
                          { key: 'pushPings', label: t('match.pings.push'), value: player?.pushPings }
                        ].map(ping => (
                          <div key={ping.key} className="flex justify-between">
                            <span className="text-muted-foreground">{ping.label}:</span>
                            <span className="font-medium">{ping.value !== undefined ? ping.value : 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Vision Pings */}
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">{t('match.pings.vision')}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'needVisionPings', label: t('match.pings.needVision'), value: player?.needVisionPings },
                          { key: 'visionClearedPings', label: t('match.pings.visionCleared'), value: player?.visionClearedPings },
                          { key: 'enemyVisionPings', label: t('match.pings.enemyVision'), value: player?.enemyVisionPings }
                        ].map(ping => (
                          <div key={ping.key} className="flex justify-between">
                            <span className="text-muted-foreground">{ping.label}:</span>
                            <span className="font-medium">{ping.value !== undefined ? ping.value : 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Movement Pings */}
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">{t('match.pings.movement')}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'holdPings', label: t('match.pings.hold'), value: player?.holdPings },
                          { key: 'getBackPings', label: t('match.pings.getBack'), value: player?.getBackPings },
                          { key: 'retreatPings', label: t('match.pings.retreat'), value: player?.retreatPings },
                          { key: 'baitPings', label: t('match.pings.bait'), value: player?.baitPings }
                        ].map(ping => (
                          <div key={ping.key} className="flex justify-between">
                            <span className="text-muted-foreground">{ping.label}:</span>
                            <span className="font-medium">{ping.value !== undefined ? ping.value : 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Other Pings */}
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">{t('match.pings.other')}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'commandPings', label: t('match.pings.command'), value: player?.commandPings },
                          { key: 'basicPings', label: t('match.pings.basicPing'), value: player?.basicPings }
                        ].map(ping => (
                          <div key={ping.key} className="flex justify-between">
                            <span className="text-muted-foreground">{ping.label}:</span>
                            <span className="font-medium">{ping.value !== undefined ? ping.value : 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('match.pings.total')}:</span>
                      <span className="font-semibold">
                        {(player?.allInPings || 0) + (player?.assistMePings || 0) + 
                         (player?.dangerPings || 0) + (player?.enemyMissingPings || 0) +
                         (player?.onMyWayPings || 0) + (player?.pushPings || 0) +
                         (player?.holdPings || 0) + (player?.needVisionPings || 0) +
                         (player?.visionClearedPings || 0) + (player?.enemyVisionPings || 0) +
                         (player?.getBackPings || 0) + (player?.retreatPings || 0) +
                         (player?.baitPings || 0) + (player?.commandPings || 0) +
                         (player?.basicPings || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Full Width Heatmap Analysis */}
          {gameInfo?.queueId === 420 && matchId && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t('heatmap.title')} - {player.summonerName || player.riotIdGameName}
                </CardTitle>
                <CardDescription>
                  {t('heatmap.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HeatmapContainer 
                  matchId={matchId}
                  participants={participants}
                  selectedParticipantId={player.participantId}
                />
              </CardContent>
            </Card>
          )}
          </>
        )}
          </>
        )
      })()}
    </div>
  )
}

export default MatchPage