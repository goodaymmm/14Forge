import React, { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { apiClient } from '@/services/api'
import { championDataService, type ChampionData } from '@/services/championData'
import { useTranslation } from 'react-i18next'

interface ChampionTooltipProps {
  championName: string
  children: React.ReactNode
  localizedName?: string
  kda?: { kills: number, deaths: number, assists: number }
  cs?: number
  gold?: number
}

const ChampionTooltip: React.FC<ChampionTooltipProps> = ({ 
  championName, 
  children, 
  localizedName,
  kda,
  cs,
  gold
}) => {
  const [championIcon, setChampionIcon] = useState<string>('')
  const [championData, setChampionData] = useState<ChampionData | null>(null)
  const [loading, setLoading] = useState(false)
  const { i18n } = useTranslation()
  
  useEffect(() => {
    if (championName) {
      // Load champion icon
      apiClient.getChampionIconUrl(championName).then(url => setChampionIcon(url))
      
      // Load champion data in current language
      setLoading(true)
      championDataService.getChampion(championName, i18n.language)
        .then(data => {
          setChampionData(data)
        })
        .catch(error => {
          console.error('Failed to load champion data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [championName, i18n.language])

  const role = championData?.tags 
    ? championDataService.getChampionRole(championData.tags, i18n.language)
    : ''

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 bg-gray-900 border-gray-700">
          <div className="flex gap-3">
            {championIcon && (
              <img src={championIcon} alt={championName} className="w-12 h-12 rounded" />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-sm text-yellow-400">
                {championData?.name || localizedName || championName}
              </div>
              {championData?.title && (
                <div className="text-xs text-gray-400">{championData.title}</div>
              )}
              {role && (
                <div className="text-xs text-blue-400">{role}</div>
              )}
              {kda && (
                <div className="text-xs text-green-400 mt-2">
                  KDA: {kda.kills}/{kda.deaths}/{kda.assists}
                </div>
              )}
              {cs !== undefined && (
                <div className="text-xs text-gray-300">CS: {cs}</div>
              )}
              {gold !== undefined && (
                <div className="text-xs text-yellow-500">Gold: {(gold / 1000).toFixed(1)}k</div>
              )}
            </div>
          </div>
          {loading && !championData && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Loading...
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ChampionTooltip