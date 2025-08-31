import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { statShardDetails } from '@/data/runesData'
import { useTranslation } from 'react-i18next'

interface StatShardTooltipProps {
  shardId: number
  children: React.ReactNode
}

const StatShardTooltip: React.FC<StatShardTooltipProps> = ({ 
  shardId, 
  children
}) => {
  const { i18n } = useTranslation()
  
  const shardData = statShardDetails[shardId as keyof typeof statShardDetails]
  
  if (!shardData) {
    return <>{children}</>
  }

  // Localized descriptions
  const getLocalizedDescription = (): string => {
    const lang = i18n.language
    
    if (lang === 'ja') {
      switch(shardId) {
        case 5008:
          return '+9 攻撃力 または +15 魔力（アダプティブ）'
        case 5005:
          return '攻撃速度 +10%'
        case 5007:
          return 'スキルヘイスト +8'
        case 5001:
          return '体力 +10-180（レベルに応じて）'
        case 5010:
          return '移動速度 +2%'
        case 5011:
          return '体力 +65'
        case 5013:
          return '強靭 +10% & スロウ耐性 +10%'
        default:
          return shardData.description
      }
    } else if (lang === 'ko') {
      switch(shardId) {
        case 5008:
          return '+9 공격력 또는 +15 주문력 (적응형)'
        case 5005:
          return '공격 속도 +10%'
        case 5007:
          return '스킬 가속 +8'
        case 5001:
          return '체력 +10-180 (레벨에 따라)'
        case 5010:
          return '이동 속도 +2%'
        case 5011:
          return '체력 +65'
        case 5013:
          return '강인함 +10% & 둔화 저항 +10%'
        default:
          return shardData.description
      }
    }
    
    return shardData.description
  }

  const getLocalizedName = (): string => {
    const lang = i18n.language
    
    if (lang === 'ja') {
      switch(shardId) {
        case 5008:
          return 'アダプティブフォース'
        case 5005:
          return '攻撃速度'
        case 5007:
          return 'スキルヘイスト'
        case 5001:
          return '体力（スケール）'
        case 5010:
          return '移動速度'
        case 5011:
          return '体力'
        case 5013:
          return '強靭とスロウ耐性'
        default:
          return shardData.name
      }
    } else if (lang === 'ko') {
      switch(shardId) {
        case 5008:
          return '적응형 능력치'
        case 5005:
          return '공격 속도'
        case 5007:
          return '스킬 가속'
        case 5001:
          return '체력 (성장)'
        case 5010:
          return '이동 속도'
        case 5011:
          return '체력'
        case 5013:
          return '강인함과 둔화 저항'
        default:
          return shardData.name
      }
    }
    
    return shardData.name
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 bg-gray-900 border-gray-700">
          <div className="space-y-1">
            <div className="font-semibold text-sm text-yellow-400">
              {getLocalizedName()}
            </div>
            <div className="text-xs text-blue-400">
              Stat Shard
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {getLocalizedDescription()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default StatShardTooltip