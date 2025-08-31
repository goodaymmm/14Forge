import React, { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { apiClient } from '@/services/api'
import { runeDataService, type RuneData } from '@/services/runeData'
import { useTranslation } from 'react-i18next'

interface RuneTooltipProps {
  runeId: number
  children: React.ReactNode
  runeName?: string
  runeDescription?: string
}

const RuneTooltip: React.FC<RuneTooltipProps> = ({ 
  runeId, 
  children, 
  runeName,
  runeDescription
}) => {
  const [runeIcon, setRuneIcon] = useState<string>('')
  const [runeData, setRuneData] = useState<RuneData | null>(null)
  const [loading, setLoading] = useState(false)
  const { i18n } = useTranslation()
  
  useEffect(() => {
    if (runeId) {
      // Load rune icon
      const iconUrl = runeDataService.getRuneIconUrl(runeId)
      setRuneIcon(iconUrl)
      
      // Also try to get from API as fallback
      apiClient.getRuneIconUrl(runeId).then(url => {
        if (url) setRuneIcon(url)
      }).catch(() => {
        // Keep the community dragon URL if API fails
      })
      
      // Load rune data in current language
      setLoading(true)
      runeDataService.getRune(runeId, i18n.language)
        .then(data => {
          setRuneData(data)
        })
        .catch(error => {
          console.error('Failed to load rune data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [runeId, i18n.language])

  // Format description by removing HTML tags
  const formatDescription = (description: string): string => {
    if (!description) return ''
    return runeDataService.formatDescription(description)
  }

  // Get display name and description
  const displayName = runeData?.name || runeName || `Rune ${runeId}`
  const displayDescription = runeData?.longDesc 
    ? formatDescription(runeData.longDesc) 
    : runeData?.shortDesc 
    ? formatDescription(runeData.shortDesc)
    : runeDescription || ''

  // Get rune type label
  const getRuneTypeLabel = (): string => {
    if (!runeData) return ''
    
    // Check if it's a keystone (usually first rune in a tree)
    const keystoneIds = [8005, 8008, 8021, 8010, 8112, 8124, 8128, 9923, 8214, 8229, 8230, 8437, 8439, 8465, 8351, 8360, 8369]
    const isKeystone = keystoneIds.includes(runeId)
    
    if (isKeystone) {
      return i18n.language === 'ja' ? 'キーストーン' :
             i18n.language === 'ko' ? '핵심 룬' :
             'Keystone'
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
            {runeIcon && (
              <img 
                src={runeIcon} 
                alt={displayName} 
                className="w-12 h-12 rounded-full border border-gray-600"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-sm text-yellow-400">
                {displayName}
              </div>
              {getRuneTypeLabel() && (
                <div className="text-xs text-blue-400">{getRuneTypeLabel()}</div>
              )}
              {displayDescription && (
                <div className="text-xs text-gray-300 mt-1">
                  {displayDescription}
                </div>
              )}
            </div>
          </div>
          {loading && !runeData && (
            <div className="text-xs text-gray-400 text-center mt-2">
              Loading...
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default RuneTooltip