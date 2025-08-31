import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'

interface InvadeAnalysisProps {
  matchId: string
  region: string
  participants: any[]
  gameDuration: number
  onNoInvade?: () => void
  asInsight?: boolean
}

interface InvadeEvaluation {
  team: number
  invadeDetected: boolean
  invadeType: 'aggressive' | 'defensive' | 'none'
  participants: number[]
  riskLevel: 'high' | 'medium' | 'low'
  minionsMissed: number
  evaluation: string
}

const InvadeAnalysis = ({ matchId, region, participants, onNoInvade, asInsight = false }: InvadeAnalysisProps) => {
  const { } = useTranslation() // t not used in current implementation
  const [timeline, setTimeline] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [invadeEvaluation, setInvadeEvaluation] = useState<InvadeEvaluation[]>([])
  
  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const response = await apiClient.getMatchTimeline(region, matchId)
        setTimeline(response)
        analyzeInvade(response)
      } catch (error) {
        console.error('Failed to fetch timeline:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchTimeline()
  }, [matchId, region])
  
  const analyzeInvade = (timelineData: any) => {
    if (!timelineData?.info?.frames) return
    
    const evaluations: InvadeEvaluation[] = []
    const frames = timelineData.info.frames
    
    // Key timestamps for invade analysis (in milliseconds)
    const keyTimestamps = [
      { time: 90000, label: '1:30' },   // Common invade time
      { time: 95000, label: '1:35' },   // Should be leaving
      { time: 98000, label: '1:38' },   // First minion clash
      { time: 100000, label: '1:40' }   // Too late, missing CS
    ]
    
    // Analyze each team
    [100, 200].forEach((teamId: number) => {
      const teamParticipants = participants.filter(p => p.teamId === teamId)
      const teamEvaluation: InvadeEvaluation = {
        team: teamId,
        invadeDetected: false,
        invadeType: 'none',
        participants: [],
        riskLevel: 'low',
        minionsMissed: 0,
        evaluation: ''
      }
      
      // Check player positions at key timestamps
      keyTimestamps.forEach(({ time, label }) => {
        const frameIndex = Math.floor(time / 60000) // Convert to minute index
        if (frameIndex >= frames.length) return
        
        const frame = frames[frameIndex]
        if (!frame.participantFrames) return
        
        teamParticipants.forEach(participant => {
          const participantFrame = frame.participantFrames[participant.participantId]
          if (!participantFrame?.position) return
          
          const pos = participantFrame.position
          const isInEnemyJungle = checkIfInEnemyJungle(pos, teamId)
          const isInLane = checkIfInLane(pos, participant.individualPosition)
          
          // Detect invade
          if (isInEnemyJungle && time <= 95000) {
            teamEvaluation.invadeDetected = true
            teamEvaluation.invadeType = 'aggressive'
            if (!teamEvaluation.participants.includes(participant.participantId)) {
              teamEvaluation.participants.push(participant.participantId)
            }
          }
          
          // Check if player returned to lane in time
          if (time === 98000 && !isInLane && participant.individualPosition !== 'JUNGLE') {
            // Player not in lane at minion arrival
            teamEvaluation.riskLevel = 'high'
            teamEvaluation.minionsMissed += 3 // First 3 minions
          } else if (time === 100000 && !isInLane && participant.individualPosition !== 'JUNGLE') {
            // Still not in lane
            teamEvaluation.minionsMissed += 6 // Full first wave
          }
        })
      })
      
      // Generate evaluation
      if (teamEvaluation.invadeDetected) {
        if (teamEvaluation.minionsMissed > 3) {
          teamEvaluation.evaluation = 'Poor invade timing - significant CS loss'
          teamEvaluation.riskLevel = 'high'
        } else if (teamEvaluation.minionsMissed > 0) {
          teamEvaluation.evaluation = 'Risky invade - some CS lost'
          teamEvaluation.riskLevel = 'medium'
        } else {
          teamEvaluation.evaluation = 'Well-timed invade - minimal losses'
          teamEvaluation.riskLevel = 'low'
        }
      } else {
        teamEvaluation.evaluation = 'Standard opening - no invade detected'
      }
      
      evaluations.push(teamEvaluation)
    })
    
    setInvadeEvaluation(evaluations)
    
    // Check if any invade was detected
    const hasInvade = evaluations.some(e => e.invadeDetected)
    if (!hasInvade && onNoInvade) {
      onNoInvade()
    }
  }
  
  const checkIfInEnemyJungle = (position: { x: number; y: number }, teamId: number): boolean => {
    // Simplified jungle boundaries
    if (teamId === 100) {
      // Blue team checking red jungle
      return position.x > 7500 && position.y > 7500
    } else {
      // Red team checking blue jungle
      return position.x < 7500 && position.y < 7500
    }
  }
  
  const checkIfInLane = (position: { x: number; y: number }, role: string): boolean => {
    // Simplified lane boundaries for 2025
    switch(role) {
      case 'TOP':
        return (position.x < 4000 && position.y > 10000) || (position.x > 10000 && position.y < 4000)
      case 'MIDDLE':
        return position.x > 5000 && position.x < 10000 && position.y > 5000 && position.y < 10000
      case 'BOTTOM':
      case 'UTILITY':
        return (position.x > 10000 && position.y > 10000) || (position.x < 4000 && position.y < 4000)
      default:
        return true // Jungle doesn't need to be in lane
    }
  }
  
  const generateHeatmap = (teamId: number) => {
    // Generate a 5x5 grid heatmap for team movement
    const grid = Array(5).fill(null).map(() => Array(5).fill(0))
    
    if (!timeline?.info?.frames) return grid
    
    // Analyze movement in first 100 seconds
    const relevantFrames = timeline.info.frames.slice(0, 2) // First 2 minutes
    
    relevantFrames.forEach((frame: any) => {
      if (!frame.participantFrames) return
      
      participants
        .filter(p => p.teamId === teamId)
        .forEach(participant => {
          const pFrame = frame.participantFrames[participant.participantId]
          if (!pFrame?.position) return
          
          // Map position to 5x5 grid
          const gridX = Math.floor(pFrame.position.x / 3000)
          const gridY = Math.floor(pFrame.position.y / 3000)
          
          if (gridX >= 0 && gridX < 5 && gridY >= 0 && gridY < 5) {
            grid[gridY][gridX]++
          }
        })
    })
    
    return grid
  }
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invade Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading timeline data...</div>
        </CardContent>
      </Card>
    )
  }
  
  // Compact view for insights mode
  if (asInsight) {
    const hasInvades = invadeEvaluation.some(e => e.invadeDetected)
    if (!hasInvades) {
      return null // Don't show if no invades detected
    }
    
    return (
      <div className="bg-white/10 rounded-lg p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Invade Detected (2025 Timing)
        </h4>
        <div className="space-y-2 text-sm">
          {invadeEvaluation.filter(e => e.invadeDetected).map(evaluation => (
            <div key={evaluation.team} className="flex items-start gap-2">
              <span className="text-green-300">✓</span>
              <div>
                <span className={evaluation.team === 100 ? 'text-blue-400' : 'text-red-400'}>
                  {evaluation.team === 100 ? 'Blue' : 'Red'} Team
                </span>
                {' - '}
                <span className={
                  evaluation.riskLevel === 'high' ? 'text-red-400' :
                  evaluation.riskLevel === 'medium' ? 'text-yellow-400' :
                  'text-green-400'
                }>
                  {evaluation.riskLevel} risk invade
                </span>
                {evaluation.minionsMissed > 0 && (
                  <span className="text-red-400"> ({evaluation.minionsMissed} CS lost)</span>
                )}
                <div className="text-xs text-gray-400 mt-1">{evaluation.evaluation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Full view for standalone mode
  return (
    <Card className="bg-[#0a0e1a] border-gray-800">
      <CardHeader className="border-b border-gray-800">
        <CardTitle className="text-base text-gray-200">Invade Analysis (2025 Meta)</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Key Timings Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="text-blue-300 font-medium">2025 Season Timings:</p>
                <ul className="text-gray-400 space-y-0.5">
                  <li>• Minions spawn: 1:05</li>
                  <li>• Mid lane arrival: 1:28</li>
                  <li>• Side lane arrival: 1:38</li>
                  <li>• Latest invade return: 1:33</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Team Evaluations */}
          <div className="grid gap-4">
            {invadeEvaluation.map(evaluation => (
              <div key={evaluation.team} className="space-y-3">
                <div className={`border rounded-lg p-3 ${
                  evaluation.team === 100 
                    ? 'border-blue-500/30 bg-blue-900/10' 
                    : 'border-red-500/30 bg-red-900/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-medium text-sm ${
                      evaluation.team === 100 ? 'text-blue-400' : 'text-red-400'
                    }`}>
                      {evaluation.team === 100 ? 'Blue Team' : 'Red Team'}
                    </h3>
                    {evaluation.invadeDetected && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        evaluation.riskLevel === 'high' 
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : evaluation.riskLevel === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                          : 'bg-green-900/30 text-green-400 border border-green-500/30'
                      }`}>
                        {evaluation.riskLevel.toUpperCase()} RISK
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {evaluation.invadeDetected ? (
                        evaluation.riskLevel === 'high' ? (
                          <XCircle className="w-4 h-4 text-red-400" />
                        ) : evaluation.riskLevel === 'medium' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )
                      ) : (
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-xs text-gray-300">{evaluation.evaluation}</span>
                    </div>
                    
                    {evaluation.invadeDetected && (
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>• Invaders: {evaluation.participants.length} players</p>
                        {evaluation.minionsMissed > 0 && (
                          <p className="text-red-400">• Minions missed: ~{evaluation.minionsMissed}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Movement Heatmap */}
                <div className="bg-gray-900/50 rounded-lg p-2">
                  <p className="text-xs text-gray-400 mb-2">Early Game Movement (0:00 - 2:00)</p>
                  <div className="grid grid-cols-5 gap-1">
                    {generateHeatmap(evaluation.team).map((row, y) => (
                      row.map((value, x) => (
                        <div 
                          key={`${x}-${y}`}
                          className="aspect-square rounded"
                          style={{
                            backgroundColor: value > 0 
                              ? `rgba(${evaluation.team === 100 ? '59, 130, 246' : '239, 68, 68'}, ${Math.min(value * 0.2, 1)})`
                              : 'rgba(17, 24, 39, 0.5)'
                          }}
                        />
                      ))
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Brighter = More presence</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default InvadeAnalysis