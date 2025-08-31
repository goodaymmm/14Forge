import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RuneTooltip from '@/components/game/RuneTooltip'
import StatShardTooltip from '@/components/game/StatShardTooltip'
import { useTranslation } from 'react-i18next'
import { runesData, statShards } from '@/data/runesData'

interface PlayerBuildAndRunesProps {
  player: any
  runeIcons: Record<number, string>
}

const PlayerBuildAndRunes = ({ player }: PlayerBuildAndRunesProps) => {
  const { } = useTranslation() // t not used in current implementation

  if (!player) return null
  
  // Debug player data
  console.log('[PlayerBuildAndRunes] Player data:', {
    perks: player.perks,
    styles: player.perks?.styles,
    statPerks: player.perks?.statPerks
  })
  
  // Get selected runes
  const primaryStyle = player.perks?.styles?.[0]
  const secondaryStyle = player.perks?.styles?.[1]
  const selectedPrimaryRunes = primaryStyle?.selections?.map((s: any) => s.perk) || []
  const selectedSecondaryRunes = secondaryStyle?.selections?.map((s: any) => s.perk) || []
  
  // Get rune tree data
  const primaryTreeData = primaryStyle ? runesData[primaryStyle.style as keyof typeof runesData] : null
  const secondaryTreeData = secondaryStyle ? runesData[secondaryStyle.style as keyof typeof runesData] : null
  
  console.log('[PlayerBuildAndRunes] Rune tree data:', {
    primaryStyle: primaryStyle?.style,
    primaryTreeData,
    secondaryStyle: secondaryStyle?.style,
    secondaryTreeData
  })

  return (
    <Card className="bg-[#0a0e1a] border-gray-800">
      <CardHeader className="pb-3 border-b border-gray-800">
        <CardTitle className="text-base text-gray-200">Runes</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Runes Display - U.GG Style with all runes shown */}
          <div className="grid grid-cols-2 gap-6">
            {/* Primary Rune Tree */}
            {primaryTreeData && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img 
                    src={`https://opgg-static.akamaized.net/meta/images/lol/latest/perkStyle/${primaryStyle.style}.png`}
                    alt={primaryTreeData.name}
                    className="w-6 h-6"
                  />
                  <span className="text-sm font-medium text-purple-400">{primaryTreeData.name}</span>
                </div>
                <div className="space-y-3">
                  {primaryTreeData.slots.map((slot, slotIdx) => (
                    <div key={slotIdx} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-gray-600 rounded-full" />
                      <div className="flex gap-2">
                        {slot.map(runeId => {
                          const isSelected = selectedPrimaryRunes.includes(runeId)
                          const isKeystone = slotIdx === 0
                          return (
                            <div 
                              key={runeId}
                              className={`relative ${isKeystone ? 'w-12 h-12' : 'w-8 h-8'} rounded-full flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-purple-900/50 border-2 border-purple-400 shadow-lg shadow-purple-500/30' 
                                  : 'bg-gray-800/50 opacity-40 grayscale'
                              }`}
                            >
                              <RuneTooltip runeId={runeId}>
                                <img 
                                  src={`https://opgg-static.akamaized.net/meta/images/lol/latest/perk/${runeId}.png`}
                                  alt=""
                                  className={`${isKeystone ? 'w-9 h-9' : 'w-6 h-6'} ${!isSelected ? 'opacity-60' : ''}`}
                                />
                              </RuneTooltip>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Secondary Rune Tree */}
            {secondaryTreeData && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img 
                    src={`https://opgg-static.akamaized.net/meta/images/lol/latest/perkStyle/${secondaryStyle.style}.png`}
                    alt={secondaryTreeData.name}
                    className="w-6 h-6"
                  />
                  <span className="text-sm font-medium text-blue-400">{secondaryTreeData.name}</span>
                </div>
                <div className="space-y-3">
                  {secondaryTreeData.slots.slice(1).map((slot, slotIdx) => {
                    // Check if any rune in this slot is selected
                    const hasSelectedRune = slot.some(runeId => selectedSecondaryRunes.includes(runeId))
                    return (
                      <div key={slotIdx} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-gray-600 rounded-full" />
                        <div className="flex gap-2">
                          {slot.map(runeId => {
                            const isSelected = selectedSecondaryRunes.includes(runeId)
                            return (
                              <div 
                                key={runeId}
                                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isSelected 
                                    ? 'bg-blue-900/50 border-2 border-blue-400 shadow-lg shadow-blue-500/30' 
                                    : hasSelectedRune ? 'bg-gray-800/50 opacity-40 grayscale' : 'bg-gray-800/30 opacity-30 grayscale'
                                }`}
                              >
                                <RuneTooltip runeId={runeId}>
                                  <img 
                                    src={`https://opgg-static.akamaized.net/meta/images/lol/latest/perk/${runeId}.png`}
                                    alt=""
                                    className={`w-6 h-6 ${!isSelected ? 'opacity-60' : ''}`}
                                  />
                                </RuneTooltip>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Stat Shards - U.GG Style */}
          <div className="border-t border-gray-700 pt-4">
            <div className="space-y-2">
              {player.perks?.statPerks && [
                { 
                  shards: statShards.offense, 
                  selected: player.perks.statPerks.offense,
                  color: 'border-red-500 bg-red-900/30',
                  unselectedColor: 'bg-gray-800/50'
                },
                { 
                  shards: statShards.flex, 
                  selected: player.perks.statPerks.flex,
                  color: 'border-purple-500 bg-purple-900/30',
                  unselectedColor: 'bg-gray-800/50'
                },
                { 
                  shards: statShards.defense, 
                  selected: player.perks.statPerks.defense,
                  color: 'border-green-500 bg-green-900/30',
                  unselectedColor: 'bg-gray-800/50'
                }
              ].map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-gray-600 rounded-full" />
                  <div className="flex gap-2">
                    {row.shards.map(shardId => {
                      const isSelected = shardId === row.selected
                      return (
                        <div 
                          key={shardId}
                          className={`relative w-7 h-7 rounded flex items-center justify-center transition-all ${
                            isSelected 
                              ? `${row.color} border` 
                              : `${row.unselectedColor} opacity-40 grayscale`
                          }`}
                        >
                          <StatShardTooltip shardId={shardId}>
                            <img 
                              src={`https://opgg-static.akamaized.net/meta/images/lol/latest/perkShard/${shardId}.png`}
                              alt=""
                              className={`w-5 h-5 ${!isSelected ? 'opacity-60' : ''}`}
                            />
                          </StatShardTooltip>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PlayerBuildAndRunes