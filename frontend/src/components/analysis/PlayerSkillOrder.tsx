import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { apiClient } from '@/services/api'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PlayerSkillOrderProps {
  player: any
}

interface ChampionSpell {
  id: string
  name: string
  description: string
  image: {
    full: string
  }
}

const PlayerSkillOrder = ({ player }: PlayerSkillOrderProps) => {
  const { t, i18n } = useTranslation()
  const [skillIcons, setSkillIcons] = useState<Record<string, string>>({})
  const [skillDetails, setSkillDetails] = useState<Record<string, { name: string; description: string }>>({})
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const loadSkillIcons = async () => {
      if (!player?.championName) {
        setLoading(false)
        return
      }
      
      try {
        const version = await apiClient.getDataDragonVersion()
        const locale = i18n.language === 'ja' ? 'ja_JP' : 
                       i18n.language === 'ko' ? 'ko_KR' : 'en_US'
        const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}/champion/${player.championName}.json`)
        const data = await response.json()
        const champion = data.data[player.championName]
        
        if (champion && champion.spells) {
          const icons: Record<string, string> = {}
          const details: Record<string, { name: string; description: string }> = {}
          const skillMap = ['Q', 'W', 'E', 'R']
          
          champion.spells.forEach((spell: ChampionSpell, idx: number) => {
            if (idx < 4) {
              icons[skillMap[idx]] = `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`
              details[skillMap[idx]] = {
                name: spell.name,
                description: spell.description.replace(/<[^>]*>/g, '') // Remove HTML tags
              }
            }
          })
          
          setSkillIcons(icons)
          setSkillDetails(details)
        }
      } catch (error) {
        console.error('Failed to load champion skill icons:', error)
      }
      
      setLoading(false)
    }
    
    loadSkillIcons()
  }, [player?.championName, i18n.language])
  
  // Group skills by type
  const skillLevels: Record<string, number[]> = { Q: [], W: [], E: [], R: [] }
  player.skillOrder?.forEach((skill: string, idx: number) => {
    if (skillLevels[skill]) {
      skillLevels[skill].push(idx + 1)
    }
  })
  
  return (
    <TooltipProvider delayDuration={0}>
      <Card className="bg-[#0a0e1a] border-gray-800">
        <CardHeader className="pb-3 border-b border-gray-800">
          <CardTitle className="text-base text-gray-200">Skill Order</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
        <div className="space-y-3">
          {['Q', 'W', 'E', 'R'].map(skill => {
            const hasIcon = skillIcons[skill]
            const skillColor = skill === 'R' ? 'red' : 
                             skill === 'Q' ? 'blue' :
                             skill === 'W' ? 'green' : 'yellow'
            
            return (
              <div key={skill} className="flex items-center gap-3">
                {/* Skill Icon or Letter */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative cursor-help">
                      {hasIcon ? (
                    <div className={`w-10 h-10 rounded border-2 border-${skillColor}-500/50 overflow-hidden bg-gray-900`}>
                      <img 
                        src={skillIcons[skill]}
                        alt={skill}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm ${
                      skill === 'R' ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50' : 
                      skill === 'Q' ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50' :
                      skill === 'W' ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50' :
                      'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50'
                    }`}>
                      {skill}
                    </div>
                  )}
                      {/* Skill letter label */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-900 border border-${skillColor}-500/50 flex items-center justify-center`}>
                        <span className={`text-[9px] font-bold text-${skillColor}-400`}>{skill}</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  {skillDetails[skill] && (
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-semibold">{skill} - {skillDetails[skill].name}</div>
                        <div className="text-xs text-muted-foreground">{skillDetails[skill].description.substring(0, 200)}...</div>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
                
                {/* Level indicators */}
                <div className="flex gap-1 flex-wrap flex-1">
                  {[...Array(18)].map((_, level) => {
                    const lvl = level + 1
                    const isLearned = skillLevels[skill]?.includes(lvl)
                    const levelIndex = skillLevels[skill]?.indexOf(lvl)
                    const orderNumber = levelIndex !== undefined && levelIndex !== -1 ? 
                      player.skillOrder?.slice(0, levelIndex + 1).filter((s: string) => s === skill).length : 0
                    
                    return (
                      <div 
                        key={lvl}
                        className={`w-7 h-7 rounded text-[11px] flex items-center justify-center transition-all ${
                          isLearned 
                            ? skill === 'R' ? 'bg-red-500/40 text-red-200 font-bold border border-red-500/30' :
                              skill === 'Q' ? 'bg-blue-500/40 text-blue-200 font-bold border border-blue-500/30' :
                              skill === 'W' ? 'bg-green-500/40 text-green-200 font-bold border border-green-500/30' :
                              'bg-yellow-500/40 text-yellow-200 font-bold border border-yellow-500/30'
                            : 'bg-gray-800/50 text-gray-600 border border-gray-700/30'
                        }`}
                        title={isLearned ? `Level ${lvl}` : ''}
                      >
                        {lvl}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Skill max order summary */}
        {player.skillOrder && player.skillOrder.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Max order:</span>
              <div className="flex gap-1">
                {(() => {
                  const maxOrder: string[] = []
                  const counts: Record<string, number> = { Q: 0, W: 0, E: 0, R: 0 }
                  
                  // Find which skills are maxed first
                  player.skillOrder.forEach((skill: string) => {
                    if (counts[skill] !== undefined) {
                      counts[skill]++
                      if ((skill === 'R' && counts[skill] === 3) || 
                          (skill !== 'R' && counts[skill] === 5)) {
                        if (!maxOrder.includes(skill)) {
                          maxOrder.push(skill)
                        }
                      }
                    }
                  })
                  
                  return maxOrder.map((skill, idx) => (
                    <span key={skill} className="flex items-center">
                      <span className={`text-xs font-bold ${
                        skill === 'R' ? 'text-red-400' :
                        skill === 'Q' ? 'text-blue-400' :
                        skill === 'W' ? 'text-green-400' :
                        'text-yellow-400'
                      }`}>{skill}</span>
                      {idx < maxOrder.length - 1 && (
                        <span className="text-gray-600 mx-1">→</span>
                      )}
                    </span>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </TooltipProvider>
  )
}

export default PlayerSkillOrder