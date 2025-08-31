import { Clock, TrendingUp, Target, Zap, Play } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import InvadeAnalysis from './InvadeAnalysis'
import { useState, useEffect } from 'react'

interface FourteenMinAnalysisProps {
  matchId: string
  region: string
  analysis?: any
  onAnalyze?: () => void
  isLoading?: boolean
  participants?: any[]
  gameDuration?: number
}

const FourteenMinAnalysis = ({ matchId, region, analysis, onAnalyze, isLoading, participants, gameDuration }: FourteenMinAnalysisProps) => {
  const { t } = useTranslation()
  const [showInvadeAnalysis, setShowInvadeAnalysis] = useState(true)
  
  // Auto-execute analysis on mount
  useEffect(() => {
    if (!analysis && onAnalyze && !isLoading) {
      console.log('[FourteenMinAnalysis] Auto-executing team analysis')
      onAnalyze()
    }
  }, []) // Only run once on mount
  if (!analysis && !onAnalyze) {
    return (
      <Card className="mb-6 shimmer">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <CardTitle>{t('common.loading')}...</CardTitle>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (!analysis && onAnalyze) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6" />
              <CardTitle className="text-white">{t('fourteenMin.teamTitle')}</CardTitle>
            </div>
          </div>
          <CardDescription className="text-gray-200">
            {t('fourteenMin.teamAnalysisDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Button 
            onClick={onAnalyze}
            disabled={isLoading}
            className="bg-white text-purple-600 hover:bg-gray-100"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2" />
                {t('common.analyzing')}...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                {t('fourteenMin.runAnalysis')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const winProbability = analysis.winPrediction || 50
  const goldDiff = analysis.goldDiff || 0
  const teamStats = analysis.teamStats || []
  
  // Determine winning team
  const winningTeam = analysis.actualWinner || (winProbability > 50 ? 100 : winProbability < 50 ? 200 : null)
  const isBlueWinning = winningTeam === 100
  const winningTeamName = isBlueWinning ? t('fourteenMin.blue') : t('fourteenMin.red')
  const winningProbability = isBlueWinning ? winProbability : (100 - winProbability)
  const adjustedGoldDiff = Math.abs(goldDiff)

  return (
    <Card className="mb-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            <CardTitle className="text-white">{t('fourteenMin.teamTitle')}</CardTitle>
          </div>
        </div>
        <CardDescription className="text-gray-200">
          {t('fourteenMin.teamAnalysisDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <p className="text-sm opacity-90">{t('fourteenMin.goldDifference')}</p>
            </div>
            <p className="text-2xl font-bold">
              +{adjustedGoldDiff}
            </p>
            <p className="text-xs opacity-75">
              {goldDiff !== 0 ? t('fourteenMin.teamLead', { team: winningTeamName }) : t('fourteenMin.even')}
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" />
              <p className="text-sm opacity-90">{t('fourteenMin.winProbability')}</p>
            </div>
            <p className="text-2xl font-bold">{winningProbability}%</p>
            <p className="text-xs opacity-75">
              {goldDiff !== 0 ? t('fourteenMin.teamFavored', { team: winningTeamName }) : t('fourteenMin.even')}
            </p>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" />
              <p className="text-sm opacity-90">{t('fourteenMin.objectives')}</p>
            </div>
            <div className="flex gap-2">
              <div>
                <p className="text-xl font-bold">
                  {teamStats[0]?.dragonKills || 0}/{teamStats[0]?.voidGrubKills || analysis.voidGrubsTeam100 || 0}
                </p>
                <p className="text-xs opacity-75">{t('fourteenMin.dragonsGrubs')}</p>
              </div>
              <div className="opacity-50">vs</div>
              <div>
                <p className="text-xl font-bold">
                  {teamStats[1]?.dragonKills || 0}/{teamStats[1]?.voidGrubKills || analysis.voidGrubsTeam200 || 0}
                </p>
                <p className="text-xs opacity-75">{t('fourteenMin.dragonsGrubs')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" />
              <p className="text-sm opacity-90">{t('fourteenMin.towerPlates')}</p>
            </div>
            <div className="flex gap-2">
              <div>
                <p className="text-xl font-bold">
                  {teamStats[0]?.towerPlates || 0}
                </p>
                <p className="text-xs opacity-75">{t('fourteenMin.blue')}</p>
              </div>
              <div className="opacity-50">vs</div>
              <div>
                <p className="text-xl font-bold">
                  {teamStats[1]?.towerPlates || 0}
                </p>
                <p className="text-xs opacity-75">{t('fourteenMin.red')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Win Prediction Bar */}
        <div className="mb-6">
          <p className="text-sm mb-2 opacity-90">{t('fourteenMin.winPrediction')}</p>
          <div className="bg-white/20 rounded-full h-8 relative overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-400 transition-all"
              style={{ width: `${winProbability}%` }}
            >
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold">
                {t('fourteenMin.blue')} {winProbability}%
              </span>
            </div>
            <div 
              className="absolute right-0 top-0 h-full bg-red-400"
              style={{ width: `${100 - winProbability}%` }}
            >
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold">
                {t('fourteenMin.red')} {100 - winProbability}%
              </span>
            </div>
          </div>
        </div>

        {/* Invade Analysis Integration */}
        {showInvadeAnalysis && participants && gameDuration && (
          <div className="mb-4">
            <InvadeAnalysis 
              matchId={matchId}
              region={region}
              participants={participants}
              gameDuration={gameDuration}
              onNoInvade={() => setShowInvadeAnalysis(false)}
              asInsight={true}
            />
          </div>
        )}

        {/* Insights */}
        {analysis.insights && analysis.insights.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4">
            <h4 className="font-semibold mb-2">{t('fourteenMin.keyInsights')}</h4>
            <ul className="space-y-1 text-sm">
              {analysis.insights.map((insight: any, i: number) => {
                let text = ''
                switch (insight.type) {
                  case 'goldLead':
                    text = t('fourteenMin.insights.goldLead', { 
                      team: t(`fourteenMin.${insight.team}`), 
                      value: insight.value 
                    })
                    break
                  case 'csEfficiency':
                    const championDisplay = insight.championName || insight.player || 'Unknown'
                    const teamColor = insight.team === 'blue' ? t('fourteenMin.blue') : t('fourteenMin.red')
                    text = t('fourteenMin.insights.csEfficiency', { 
                      player: `${championDisplay}(${teamColor})`, 
                      value: insight.value 
                    })
                    break
                  case 'dragonControl':
                    text = t('fourteenMin.insights.dragonControl', { 
                      team: t(`fourteenMin.${insight.team}`), 
                      value: insight.value 
                    })
                    break
                  case 'voidGrubControl':
                    text = t('fourteenMin.insights.voidGrubControl', { 
                      team: t(`fourteenMin.${insight.team}`), 
                      value: insight.value 
                    })
                    break
                  case 'towerAdvantage':
                    text = t('fourteenMin.insights.towerAdvantage', { 
                      team: t(`fourteenMin.${insight.team}`), 
                      value: insight.value 
                    })
                    break
                  case 'plateAdvantage':
                    text = t('fourteenMin.insights.plateAdvantage', { 
                      team: t(`fourteenMin.${insight.team}`), 
                      value: insight.value 
                    })
                    break
                  case 'visionScore':
                    const visionChampion = insight.championName || insight.player || 'Unknown'
                    const visionTeam = insight.team === 'blue' ? t('fourteenMin.blue') : t('fourteenMin.red')
                    text = t('fourteenMin.insights.visionScore', { 
                      player: `${visionChampion}(${visionTeam})`, 
                      value: insight.value 
                    })
                    break
                  case 'wardPlacement':
                    const wardChampion = insight.championName || insight.player || 'Unknown'
                    const wardTeam = insight.team === 'blue' ? t('fourteenMin.blue') : t('fourteenMin.red')
                    text = t('fourteenMin.insights.wardPlacement', { 
                      player: `${wardChampion}(${wardTeam})`, 
                      value: insight.value 
                    })
                    break
                  default:
                    // Fallback for unknown insight types - show in English
                    console.warn('Unknown insight type:', insight)
                    text = ''
                }
                return text ? (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-300">✓</span>
                    <span>{text}</span>
                  </li>
                ) : null
              })}
            </ul>
          </div>
        )}

      </CardContent>
    </Card>
  )
}

export default FourteenMinAnalysis