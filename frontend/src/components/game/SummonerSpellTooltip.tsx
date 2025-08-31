import React, { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { apiClient } from '@/services/api'
import { summonerSpellDataService, type SummonerSpellData } from '@/services/summonerSpellData'
import { useTranslation } from 'react-i18next'

interface SummonerSpellTooltipProps {
  spellId: number
  children: React.ReactNode
}

const SummonerSpellTooltip: React.FC<SummonerSpellTooltipProps> = ({ 
  spellId, 
  children
}) => {
  const [spellIcon, setSpellIcon] = useState<string>('')
  const [spellData, setSpellData] = useState<SummonerSpellData | null>(null)
  const [loading, setLoading] = useState(false)
  const { i18n, t } = useTranslation()
  
  useEffect(() => {
    if (spellId) {
      // Load spell icon
      apiClient.getSummonerSpellIconUrl(spellId).then(url => setSpellIcon(url))
      
      // Load spell data in current language
      setLoading(true)
      summonerSpellDataService.getSummonerSpell(spellId, i18n.language)
        .then(data => {
          setSpellData(data)
        })
        .catch(error => {
          console.error('Failed to load summoner spell data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [spellId, i18n.language])

  // Format description by removing HTML tags
  const formatDescription = (description: string): string => {
    if (!description) return ''
    return summonerSpellDataService.formatDescription(description)
  }

  // Get cooldown display
  const getCooldownDisplay = (): string => {
    if (!spellData) return ''
    
    const cooldownLabel = i18n.language === 'ja' ? 'クールダウン' : 
                          i18n.language === 'ko' ? '재사용 대기시간' : 
                          'Cooldown'
    
    if (spellData.cooldownBurn && spellData.cooldownBurn !== '0') {
      return `${cooldownLabel}: ${spellData.cooldownBurn}s`
    }
    
    return ''
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 bg-gray-900 border-gray-700">
          <div className="flex gap-3">
            {spellIcon && (
              <img src={spellIcon} alt={spellData?.name || `Spell ${spellId}`} className="w-12 h-12 rounded" />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-sm text-yellow-400">
                {spellData?.name || `Spell ${spellId}`}
              </div>
              {spellData?.description && (
                <div className="text-xs text-gray-300 mt-1">
                  {formatDescription(spellData.description)}
                </div>
              )}
              {getCooldownDisplay() && (
                <div className="text-xs text-blue-400 mt-1">
                  {getCooldownDisplay()}
                </div>
              )}
              {spellData?.summonerLevel && spellData.summonerLevel > 1 && (
                <div className="text-xs text-gray-400">
                  {i18n.language === 'ja' ? `必要レベル: ${spellData.summonerLevel}` :
                   i18n.language === 'ko' ? `필요 레벨: ${spellData.summonerLevel}` :
                   `Required Level: ${spellData.summonerLevel}`}
                </div>
              )}
            </div>
          </div>
          {loading && !spellData && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Loading...
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default SummonerSpellTooltip