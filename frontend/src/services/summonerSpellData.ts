import axios from 'axios'

interface SummonerSpellData {
  id: string
  name: string
  description: string
  tooltip: string
  maxrank: number
  cooldown: number[]
  cooldownBurn: string
  cost: number[]
  costBurn: string
  key: string
  summonerLevel: number
  modes: string[]
  costType: string
  maxammo: string
  range: number[]
  rangeBurn: string
  resource: string
}

interface SummonerSpellsData {
  [spellKey: string]: SummonerSpellData
}

class SummonerSpellDataService {
  private spellsData: { [lang: string]: SummonerSpellsData } = {}
  private version: string | null = null
  private loadingPromises: { [lang: string]: Promise<SummonerSpellsData> | null } = {}

  private readonly languageMap: { [key: string]: string } = {
    'en': 'en_US',
    'ja': 'ja_JP',
    'ko': 'ko_KR'
  }

  // Common summoner spell ID to key mapping
  private readonly spellIdToKey: { [id: number]: string } = {
    21: 'SummonerBarrier',
    1: 'SummonerBoost',
    14: 'SummonerDot',
    3: 'SummonerExhaust',
    4: 'SummonerFlash',
    6: 'SummonerHaste',
    7: 'SummonerHeal',
    13: 'SummonerMana',
    30: 'SummonerPoroRecall',
    31: 'SummonerPoroThrow',
    11: 'SummonerSmite',
    39: 'SummonerSnowball',
    32: 'SummonerSnowball',
    12: 'SummonerTeleport',
    54: 'Summoner_UltBookPlaceholder',
    55: 'Summoner_UltBookSmitePlaceholder'
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

  async loadSummonerSpellData(language: string = 'en'): Promise<SummonerSpellsData> {
    const langCode = this.languageMap[language] || 'en_US'
    
    if (this.spellsData[langCode]) {
      return this.spellsData[langCode]
    }

    if (this.loadingPromises[langCode]) {
      return this.loadingPromises[langCode]!
    }

    const cacheKey = `summonerspells_${langCode}`
    const cachedData = localStorage.getItem(cacheKey)
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`)
    
    if (cachedData && cacheTimestamp) {
      const timestamp = parseInt(cacheTimestamp)
      const oneDay = 24 * 60 * 60 * 1000
      
      if (Date.now() - timestamp < oneDay) {
        try {
          const parsed = JSON.parse(cachedData)
          this.spellsData[langCode] = parsed
          return parsed
        } catch (error) {
          console.error('Failed to parse cached summoner spell data:', error)
        }
      }
    }

    this.loadingPromises[langCode] = this.fetchSummonerSpellData(langCode)
    
    try {
      const data = await this.loadingPromises[langCode]!
      this.spellsData[langCode] = data
      
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
      
      return data
    } finally {
      this.loadingPromises[langCode] = null
    }
  }

  private async fetchSummonerSpellData(langCode: string): Promise<SummonerSpellsData> {
    const version = await this.getDataDragonVersion()
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${langCode}/summoner.json`
    
    try {
      const response = await axios.get(url)
      return response.data.data
    } catch (error) {
      console.error(`Failed to fetch summoner spell data for ${langCode}:`, error)
      
      if (langCode !== 'en_US') {
        console.log('Falling back to English summoner spell data')
        const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`
        const response = await axios.get(fallbackUrl)
        return response.data.data
      }
      
      throw error
    }
  }

  async getSummonerSpell(spellId: number | string, language: string = 'en'): Promise<SummonerSpellData | null> {
    const spells = await this.loadSummonerSpellData(language)
    
    // If it's a number, convert to spell key
    if (typeof spellId === 'number') {
      const spellKey = this.spellIdToKey[spellId]
      if (spellKey && spells[spellKey]) {
        return spells[spellKey]
      }
    }
    
    // Try direct key match
    if (typeof spellId === 'string' && spells[spellId]) {
      return spells[spellId]
    }
    
    // Try to find by numeric key field
    const spell = Object.values(spells).find(s => s.key === spellId.toString())
    
    return spell || null
  }

  formatDescription(description: string): string {
    if (!description) return ''
    
    // Remove HTML tags
    let formatted = description.replace(/<[^>]*>/g, '')
    
    // Replace special formatting
    formatted = formatted.replace(/{{ (\w+) }}/g, '$1')
    
    return formatted
  }

  clearCache(): void {
    this.spellsData = {}
    this.version = null
    
    const languages = ['en_US', 'ja_JP', 'ko_KR']
    languages.forEach(lang => {
      localStorage.removeItem(`summonerspells_${lang}`)
      localStorage.removeItem(`summonerspells_${lang}_timestamp`)
    })
  }
}

export const summonerSpellDataService = new SummonerSpellDataService()
export type { SummonerSpellData, SummonerSpellsData }