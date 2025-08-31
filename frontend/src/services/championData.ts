import axios from 'axios'

interface ChampionData {
  id: string
  key: string
  name: string
  title: string
  blurb: string
  tags: string[]
  partype: string
  stats: {
    hp: number
    hpperlevel: number
    mp: number
    mpperlevel: number
    movespeed: number
    armor: number
    armorperlevel: number
    spellblock: number
    spellblockperlevel: number
    attackrange: number
    hpregen: number
    hpregenperlevel: number
    mpregen: number
    mpregenperlevel: number
    crit: number
    critperlevel: number
    attackdamage: number
    attackdamageperlevel: number
    attackspeedperlevel: number
    attackspeed: number
  }
}

interface ChampionsData {
  [championId: string]: ChampionData
}

class ChampionDataService {
  private championsData: { [lang: string]: ChampionsData } = {}
  private version: string | null = null
  private loadingPromises: { [lang: string]: Promise<ChampionsData> | null } = {}

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
      this.version = '14.24.1'
      return this.version || '14.24.1'
    }
  }

  async loadChampionData(language: string = 'en'): Promise<ChampionsData> {
    const langCode = this.languageMap[language] || 'en_US'
    
    if (this.championsData[langCode]) {
      return this.championsData[langCode]
    }

    if (this.loadingPromises[langCode]) {
      return this.loadingPromises[langCode]!
    }

    const cacheKey = `champions_${langCode}`
    const cachedData = localStorage.getItem(cacheKey)
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`)
    
    if (cachedData && cacheTimestamp) {
      const timestamp = parseInt(cacheTimestamp)
      const oneDay = 24 * 60 * 60 * 1000
      
      if (Date.now() - timestamp < oneDay) {
        try {
          const parsed = JSON.parse(cachedData)
          this.championsData[langCode] = parsed
          return parsed
        } catch (error) {
          console.error('Failed to parse cached champion data:', error)
        }
      }
    }

    this.loadingPromises[langCode] = this.fetchChampionData(langCode)
    
    try {
      const data = await this.loadingPromises[langCode]!
      this.championsData[langCode] = data
      
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
      
      return data
    } finally {
      this.loadingPromises[langCode] = null
    }
  }

  private async fetchChampionData(langCode: string): Promise<ChampionsData> {
    const version = await this.getDataDragonVersion()
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${langCode}/champion.json`
    
    try {
      const response = await axios.get(url)
      return response.data.data
    } catch (error) {
      console.error(`Failed to fetch champion data for ${langCode}:`, error)
      
      if (langCode !== 'en_US') {
        console.log('Falling back to English champion data')
        const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
        const response = await axios.get(fallbackUrl)
        return response.data.data
      }
      
      throw error
    }
  }

  async getChampion(championId: string, language: string = 'en'): Promise<ChampionData | null> {
    const champions = await this.loadChampionData(language)
    
    // Try by ID first
    if (champions[championId]) {
      return champions[championId]
    }
    
    // Try by name (case insensitive)
    const champion = Object.values(champions).find(
      c => c.id.toLowerCase() === championId.toLowerCase() ||
           c.name.toLowerCase() === championId.toLowerCase()
    )
    
    return champion || null
  }

  getChampionRole(tags: string[], language: string = 'en'): string {
    const roleMap: { [key: string]: { [lang: string]: string } } = {
      'Fighter': {
        'en': 'Fighter',
        'ja': 'ファイター',
        'ko': '전사'
      },
      'Tank': {
        'en': 'Tank',
        'ja': 'タンク',
        'ko': '탱커'
      },
      'Mage': {
        'en': 'Mage',
        'ja': 'メイジ',
        'ko': '마법사'
      },
      'Assassin': {
        'en': 'Assassin',
        'ja': 'アサシン',
        'ko': '암살자'
      },
      'Support': {
        'en': 'Support',
        'ja': 'サポート',
        'ko': '서포터'
      },
      'Marksman': {
        'en': 'Marksman',
        'ja': 'マークスマン',
        'ko': '원거리 딜러'
      }
    }

    const translatedRoles = tags.map(tag => 
      roleMap[tag]?.[language] || roleMap[tag]?.['en'] || tag
    )

    return translatedRoles.join(' / ')
  }

  clearCache(): void {
    this.championsData = {}
    this.version = null
    
    const languages = ['en_US', 'ja_JP', 'ko_KR']
    languages.forEach(lang => {
      localStorage.removeItem(`champions_${lang}`)
      localStorage.removeItem(`champions_${lang}_timestamp`)
    })
  }
}

export const championDataService = new ChampionDataService()
export type { ChampionData, ChampionsData }