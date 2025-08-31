import { Clock, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface PlayerFourteenMinAnalysisProps {
  participant: any
  analysis?: any
  onAnalyze?: () => void
  isLoading?: boolean
}

const PlayerFourteenMinAnalysis = ({ participant, analysis, onAnalyze, isLoading }: PlayerFourteenMinAnalysisProps) => {
  const { t } = useTranslation()

  if (!analysis || !analysis.participants) {
    if (onAnalyze) {
      return (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            {t('fourteenMin.playerTitle')}
          </h3>
          <div className="flex justify-center py-4">
            <Button 
              onClick={onAnalyze}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="text-purple-600 hover:bg-purple-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 mr-2" />
                  {t('fourteenMin.runAnalysis')}
                </>
              )}
            </Button>
          </div>
        </div>
      )
    }
    return null
  }

  // Find this player's 14-minute data
  const playerData = analysis.participants.find(
    (p: any) => p.participantId === participant.participantId || 
                p.puuid === participant.puuid
  )

  if (!playerData) {
    return null
  }

  // Determine player role
  const role = participant.teamPosition || participant.individualPosition || 'UNKNOWN'
  const isLaner = ['TOP', 'MIDDLE'].includes(role)
  const isJungler = role === 'JUNGLE'
  const isADC = role === 'BOTTOM'
  const isSupport = role === 'UTILITY'

  return (
    <div className="border-t pt-4 mt-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple-500" />
        {t('fourteenMin.playerTitle')}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CS at 14 min - All roles */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.csAt14')}
          </div>
          <div className="font-semibold">{playerData.cs || 0}</div>
          <div className="text-xs text-muted-foreground">
            {((playerData.cs || 0) / 14).toFixed(1)} {t('common.perMin')}
          </div>
        </div>

        {/* Gold at 14 min - All roles */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.goldAt14')}
          </div>
          <div className="font-semibold">
            {Math.round(playerData.totalGold || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {playerData.goldPerMinute?.toFixed(0)} {t('common.perMin')}
          </div>
        </div>

        {/* Level at 14 min - All roles */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.levelAt14')}
          </div>
          <div className="font-semibold">{playerData.level || 0}</div>
          <div className="text-xs text-muted-foreground">
            {playerData.xpPerMinute?.toFixed(0)} XP/{t('common.min')}
          </div>
        </div>

        {/* Role-specific stats */}
        {isLaner && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">
              {t('fourteenMin.soloKillsDeath')}
            </div>
            <div className="font-semibold">
              {playerData.soloKills || 0} / {playerData.soloDeaths || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('fourteenMin.roams')}: {playerData.roamCount || 0}
            </div>
          </div>
        )}

        {isJungler && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">
              {t('fourteenMin.farmEfficiency')}
            </div>
            <div className="font-semibold">
              {playerData.csEfficiency || 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              {t('fourteenMin.ganks')}: {playerData.gankCount || 0}
            </div>
          </div>
        )}

        {isADC && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">
              {t('fourteenMin.csEfficiency')}
            </div>
            <div className="font-semibold">
              {playerData.csEfficiency || 0}%
            </div>
            <div className="text-xs text-muted-foreground">
              APM: {playerData.estimatedAPM || 0}
            </div>
          </div>
        )}

        {isSupport && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">
              {t('fourteenMin.warding')}
            </div>
            <div className="font-semibold">
              {playerData.wardsPlaced || analysis.participants?.find((p: any) => p.puuid === participant.puuid)?.wardsPlaced || participant.wardsPlaced || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('fourteenMin.roams')}: {playerData.roamCount || analysis.participants?.find((p: any) => p.puuid === participant.puuid)?.roamCount || 0}
            </div>
          </div>
        )}
      </div>

      {/* Additional role-specific stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
        {/* Tower Plates - All roles */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.towerPlates')}
          </div>
          <div className="font-semibold">{
            playerData.towerPlates || 
            participant.challenges?.turretPlatesTaken || 
            analysis.participants?.find((p: any) => p.puuid === participant.puuid)?.towerPlates || 
            0
          }</div>
        </div>

        {/* Objective Participation - All roles */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.objectiveParticipation')}
          </div>
          <div className="font-semibold">{
            playerData.objectiveParticipation || 
            ((participant.challenges?.dragonTakedowns || 0) + (participant.challenges?.riftHeraldTakedowns || 0)) ||
            analysis.participants?.find((p: any) => p.puuid === participant.puuid)?.objectiveParticipation || 
            0
          }</div>
        </div>

        {/* KDA or Kill Participation */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="text-xs text-muted-foreground mb-1">
            {t('fourteenMin.killParticipation')}
          </div>
          <div className="font-semibold">{
            playerData.killParticipation || 
            (participant.challenges?.killParticipation ? Math.round(participant.challenges.killParticipation * 100) : 0) ||
            analysis.participants?.find((p: any) => p.puuid === participant.puuid)?.killParticipation || 
            0
          }%</div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
        <div className="text-xs font-medium mb-1">{t('fourteenMin.performanceVsHighTier')}</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">{t('fourteenMin.expectedCs')}:</span>
            <span className="ml-1 font-medium">
              {role === 'MIDDLE' ? 133 : 
               role === 'BOTTOM' ? 133 : 
               role === 'TOP' ? 119 :
               role === 'JUNGLE' ? 88 :
               role === 'UTILITY' ? 24 : 100}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('fourteenMin.expectedGold')}:</span>
            <span className="ml-1 font-medium">
              {role === 'MIDDLE' ? 5400 : 
               role === 'BOTTOM' ? 5500 : 
               role === 'TOP' ? 5200 :
               role === 'JUNGLE' ? 4800 :
               role === 'UTILITY' ? 3800 : 5000}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">{t('fourteenMin.expectedLevel')}:</span>
            <span className="ml-1 font-medium">
              {role === 'MIDDLE' ? 9 : 
               role === 'BOTTOM' ? 9 : 
               role === 'TOP' ? 9 :
               role === 'JUNGLE' ? 8 :
               role === 'UTILITY' ? 8 : 9}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          * {t('fourteenMin.benchmarkNote')}
        </div>
      </div>

      {/* Team Contribution */}
      {playerData.teamId && analysis.teamStats && (
        <div className="mt-2 text-xs text-muted-foreground">
          {t('fourteenMin.teamContribution')}: {
            ((playerData.totalGold / analysis.teamStats.find((t: any) => t.teamId === playerData.teamId)?.totalGold) * 100).toFixed(1)
          }%
        </div>
      )}
    </div>
  )
}

export default PlayerFourteenMinAnalysis