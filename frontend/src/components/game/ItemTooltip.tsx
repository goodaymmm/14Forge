import React, { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { apiClient } from '@/services/api'
import { itemDataService, type ItemData } from '@/services/itemData'
import { useTranslation } from 'react-i18next'

interface ItemTooltipProps {
  itemId: number
  children: React.ReactNode
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({ itemId, children }) => {
  const [itemIcon, setItemIcon] = useState<string>('')
  const [itemData, setItemData] = useState<ItemData | null>(null)
  const [loading, setLoading] = useState(false)
  const { i18n, t } = useTranslation()
  
  useEffect(() => {
    if (itemId && itemId !== 0) {
      // Load item icon
      apiClient.getItemIconUrl(itemId).then(url => setItemIcon(url))
      
      // Load item data in current language
      setLoading(true)
      itemDataService.getItem(itemId, i18n.language)
        .then(data => {
          setItemData(data)
        })
        .catch(error => {
          console.error('Failed to load item data:', error)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [itemId, i18n.language])

  if (!itemId || itemId === 0) {
    return <>{children}</>
  }

  // Format description by removing HTML tags and special formatting
  const formatDescription = (description: string): string => {
    if (!description) return ''
    
    // Remove HTML tags
    let formatted = description.replace(/<[^>]*>/g, '')
    
    // Replace special markers
    formatted = formatted.replace(/{{ (\w+) }}/g, (match, key) => {
      const stats = itemData?.stats
      if (stats && stats[key]) {
        return stats[key].toString()
      }
      return match
    })
    
    return formatted
  }

  // Get translated labels
  const getLabel = (key: string): string => {
    const labels: { [key: string]: { [lang: string]: string } } = {
      'cost': {
        'en': 'Cost',
        'ja': 'コスト',
        'ko': '가격'
      },
      'sellPrice': {
        'en': 'Sell',
        'ja': '売却',
        'ko': '판매'
      },
      'stats': {
        'en': 'Stats',
        'ja': 'ステータス',
        'ko': '능력치'
      },
      'passive': {
        'en': 'Passive',
        'ja': 'パッシブ',
        'ko': '고유 지속'
      },
      'active': {
        'en': 'Active',
        'ja': 'アクティブ',
        'ko': '고유 사용'
      }
    }
    
    return labels[key]?.[i18n.language] || labels[key]?.['en'] || key
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-0 bg-gray-900 border-gray-700 overflow-hidden">
          <div className="p-3 space-y-2">
            {/* Header with icon and name */}
            <div className="flex gap-3 items-start">
              {itemIcon && (
                <img 
                  src={itemIcon} 
                  alt={itemData?.name || `Item ${itemId}`} 
                  className="w-12 h-12 rounded border border-gray-700"
                />
              )}
              <div className="flex-1">
                <div className="font-bold text-sm text-yellow-400">
                  {itemData?.name || `Item ${itemId}`}
                </div>
                {itemData?.plaintext && (
                  <div className="text-xs text-gray-400 mt-0.5">
                    {itemData.plaintext}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            {itemData?.stats && Object.keys(itemData.stats).length > 0 && (
              <div className="space-y-1 pt-2 border-t border-gray-700">
                {itemDataService.formatItemStats(itemData.stats, i18n.language).map((stat, idx) => (
                  <div key={idx} className="text-xs text-green-400">
                    {stat}
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {itemData?.description && (
              <div className="text-xs text-gray-300 pt-2 border-t border-gray-700 space-y-1">
                {formatDescription(itemData.description).split('\n').map((line, idx) => (
                  <div key={idx}>
                    {line.startsWith('UNIQUE') || line.includes('Passive') || line.includes('パッシブ') || line.includes('고유') ? (
                      <span className="text-blue-400">{line}</span>
                    ) : line.startsWith('Active') || line.includes('アクティブ') || line.includes('사용 시') ? (
                      <span className="text-orange-400">{line}</span>
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Price */}
            {itemData?.gold && (
              <div className="flex justify-between text-xs pt-2 border-t border-gray-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">{getLabel('cost')}:</span>
                    <span className="text-yellow-500 font-semibold">
                      {itemData.gold.total.toLocaleString()}
                    </span>
                  </div>
                  {itemData.gold.sell > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">{getLabel('sellPrice')}:</span>
                      <span className="text-gray-500">
                        {itemData.gold.sell.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading && !itemData && (
            <div className="p-3 text-xs text-gray-400 text-center">
              Loading...
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ItemTooltip