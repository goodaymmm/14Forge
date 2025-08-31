import axios from 'axios'

interface ItemData {
  name: string
  description: string
  plaintext?: string
  gold: {
    base: number
    total: number
    sell: number
  }
  stats?: {
    [key: string]: number
  }
  tags?: string[]
  into?: string[]
  from?: string[]
}

interface ItemsData {
  [itemId: string]: ItemData
}

class ItemDataService {
  private itemsData: { [lang: string]: ItemsData } = {}
  private version: string | null = null
  private loadingPromises: { [lang: string]: Promise<ItemsData> | null } = {}

  private readonly languageMap: { [key: string]: string } = {
    'en': 'en_US',
    'ja': 'ja_JP',
    'ko': 'ko_KR'
  }

  private async getDataDragonVersion(): Promise<string> {
    if (this.version) {
      return this.version || '14.24.1'
    }

    try {
      const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
      this.version = response.data[0]
      return this.version || '14.24.1'
    } catch (error) {
      console.error('Failed to fetch Data Dragon version:', error)
      // Fallback to a known version
      this.version = '14.24.1'
      return this.version || '14.24.1'
    }
  }

  async loadItemData(language: string = 'en'): Promise<ItemsData> {
    const langCode = this.languageMap[language] || 'en_US'
    
    // Check if data is already loaded
    if (this.itemsData[langCode]) {
      return this.itemsData[langCode]
    }

    // Check if loading is already in progress
    if (this.loadingPromises[langCode]) {
      return this.loadingPromises[langCode]!
    }

    // Check localStorage cache
    const cacheKey = `items_${langCode}`
    const cachedData = localStorage.getItem(cacheKey)
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`)
    
    if (cachedData && cacheTimestamp) {
      const timestamp = parseInt(cacheTimestamp)
      const oneDay = 24 * 60 * 60 * 1000
      
      if (Date.now() - timestamp < oneDay) {
        try {
          const parsed = JSON.parse(cachedData)
          this.itemsData[langCode] = parsed
          return parsed
        } catch (error) {
          console.error('Failed to parse cached item data:', error)
        }
      }
    }

    // Load from Data Dragon API
    this.loadingPromises[langCode] = this.fetchItemData(langCode)
    
    try {
      const data = await this.loadingPromises[langCode]!
      this.itemsData[langCode] = data
      
      // Cache to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
      
      return data
    } finally {
      this.loadingPromises[langCode] = null
    }
  }

  private async fetchItemData(langCode: string): Promise<ItemsData> {
    const version = await this.getDataDragonVersion()
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${langCode}/item.json`
    
    try {
      const response = await axios.get(url)
      return response.data.data
    } catch (error) {
      console.error(`Failed to fetch item data for ${langCode}:`, error)
      
      // Fallback to English if other language fails
      if (langCode !== 'en_US') {
        console.log('Falling back to English item data')
        const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`
        const response = await axios.get(fallbackUrl)
        return response.data.data
      }
      
      throw error
    }
  }

  async getItem(itemId: number | string, language: string = 'en'): Promise<ItemData | null> {
    const items = await this.loadItemData(language)
    return items[itemId.toString()] || null
  }

  formatItemStats(stats?: { [key: string]: number }, language: string = 'en'): string[] {
    if (!stats) return []
    
    const statNames: { [key: string]: { [lang: string]: string } } = {
      'FlatHPPoolMod': {
        'en': 'Health',
        'ja': '体力',
        'ko': '체력'
      },
      'FlatMPPoolMod': {
        'en': 'Mana',
        'ja': 'マナ',
        'ko': '마나'
      },
      'FlatPhysicalDamageMod': {
        'en': 'Attack Damage',
        'ja': '攻撃力',
        'ko': '공격력'
      },
      'FlatMagicDamageMod': {
        'en': 'Ability Power',
        'ja': '魔力',
        'ko': '주문력'
      },
      'FlatArmorMod': {
        'en': 'Armor',
        'ja': '物理防御',
        'ko': '방어력'
      },
      'FlatSpellBlockMod': {
        'en': 'Magic Resist',
        'ja': '魔法防御',
        'ko': '마법 저항력'
      },
      'FlatCritChanceMod': {
        'en': 'Critical Strike Chance',
        'ja': 'クリティカル率',
        'ko': '치명타 확률'
      },
      'PercentAttackSpeedMod': {
        'en': 'Attack Speed',
        'ja': '攻撃速度',
        'ko': '공격 속도'
      },
      'PercentLifeStealMod': {
        'en': 'Life Steal',
        'ja': 'ライフスティール',
        'ko': '생명력 흡수'
      },
      'FlatMovementSpeedMod': {
        'en': 'Movement Speed',
        'ja': '移動速度',
        'ko': '이동 속도'
      }
    }

    const formattedStats: string[] = []
    
    for (const [key, value] of Object.entries(stats)) {
      if (value === 0) continue
      
      const statName = statNames[key]?.[language] || statNames[key]?.['en'] || key
      const formattedValue = key.includes('Percent') || key.includes('Crit') 
        ? `${(value * 100).toFixed(0)}%` 
        : `+${value}`
      
      formattedStats.push(`${formattedValue} ${statName}`)
    }
    
    return formattedStats
  }

  clearCache(): void {
    // Clear all cached data
    this.itemsData = {}
    this.version = null
    
    // Clear localStorage
    const languages = ['en_US', 'ja_JP', 'ko_KR']
    languages.forEach(lang => {
      localStorage.removeItem(`items_${lang}`)
      localStorage.removeItem(`items_${lang}_timestamp`)
    })
  }
}

export const itemDataService = new ItemDataService()
export type { ItemData, ItemsData }