import axios from 'axios'

interface RuneData {
  id: number
  key: string
  name: string
  icon: string
  shortDesc: string
  longDesc: string
}

interface RuneTreeData {
  id: number
  key: string
  name: string
  icon: string
  slots: Array<{
    runes: RuneData[]
  }>
}

class RuneDataService {
  private runesData: { [lang: string]: RuneTreeData[] } = {}
  private version: string | null = null
  private loadingPromises: { [lang: string]: Promise<RuneTreeData[]> | null } = {}

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

  async loadRuneData(language: string = 'en'): Promise<RuneTreeData[]> {
    const langCode = this.languageMap[language] || 'en_US'
    
    if (this.runesData[langCode]) {
      return this.runesData[langCode]
    }

    if (this.loadingPromises[langCode]) {
      return this.loadingPromises[langCode]!
    }

    const cacheKey = `runes_${langCode}`
    const cachedData = localStorage.getItem(cacheKey)
    const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`)
    
    if (cachedData && cacheTimestamp) {
      const timestamp = parseInt(cacheTimestamp)
      const oneDay = 24 * 60 * 60 * 1000
      
      if (Date.now() - timestamp < oneDay) {
        try {
          const parsed = JSON.parse(cachedData)
          this.runesData[langCode] = parsed
          return parsed
        } catch (error) {
          console.error('Failed to parse cached rune data:', error)
        }
      }
    }

    this.loadingPromises[langCode] = this.fetchRuneData(langCode)
    
    try {
      const data = await this.loadingPromises[langCode]!
      this.runesData[langCode] = data
      
      localStorage.setItem(cacheKey, JSON.stringify(data))
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
      
      return data
    } finally {
      this.loadingPromises[langCode] = null
    }
  }

  private async fetchRuneData(langCode: string): Promise<RuneTreeData[]> {
    const version = await this.getDataDragonVersion()
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/${langCode}/runesReforged.json`
    
    try {
      const response = await axios.get(url)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch rune data for ${langCode}:`, error)
      
      if (langCode !== 'en_US') {
        console.log('Falling back to English rune data')
        const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`
        const response = await axios.get(fallbackUrl)
        return response.data
      }
      
      throw error
    }
  }

  async getRune(runeId: number, language: string = 'en'): Promise<RuneData | null> {
    const runeTrees = await this.loadRuneData(language)
    
    for (const tree of runeTrees) {
      for (const slot of tree.slots) {
        const rune = slot.runes.find(r => r.id === runeId)
        if (rune) {
          return rune
        }
      }
    }
    
    return null
  }

  async getRuneTree(treeId: number, language: string = 'en'): Promise<RuneTreeData | null> {
    const runeTrees = await this.loadRuneData(language)
    return runeTrees.find(tree => tree.id === treeId) || null
  }

  formatDescription(description: string): string {
    if (!description) return ''
    
    // Remove HTML tags
    let formatted = description.replace(/<[^>]*>/g, '')
    
    // Replace special formatting
    formatted = formatted.replace(/{{ (\w+) }}/g, '$1')
    
    return formatted
  }

  getRuneIconUrl(runeId: number): string {
    // Using Community Dragon CDN for rune icons as a fallback
    // These are more reliable than Data Dragon for runes
    const baseUrl = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1'
    
    // Map common rune IDs to their icon paths
    const runeIconPaths: { [key: number]: string } = {
      // Precision
      8005: '/perk-images/styles/precision/presstheattack/presstheattack.png',
      8008: '/perk-images/styles/precision/lethaltempo/lethaltempotemp.png',
      8021: '/perk-images/styles/precision/fleetfootwork/fleetfootwork.png',
      8010: '/perk-images/styles/precision/conqueror/conqueror.png',
      
      // Domination
      8112: '/perk-images/styles/domination/electrocute/electrocute.png',
      8124: '/perk-images/styles/domination/predator/predator.png',
      8128: '/perk-images/styles/domination/darkharvest/darkharvest.png',
      9923: '/perk-images/styles/domination/hailofblades/hailofblades.png',
      
      // Sorcery
      8214: '/perk-images/styles/sorcery/summonaery/summonaery.png',
      8229: '/perk-images/styles/sorcery/arcanecomet/arcanecomet.png',
      8230: '/perk-images/styles/sorcery/phaserush/phaserush.png',
      
      // Resolve
      8437: '/perk-images/styles/resolve/graspoftheundying/graspoftheundying.png',
      8439: '/perk-images/styles/resolve/veteranaftershock/veteranaftershock.png',
      8465: '/perk-images/styles/resolve/guardian/guardian.png',
      
      // Inspiration
      8351: '/perk-images/styles/inspiration/glacialaugment/glacialaugment.png',
      8360: '/perk-images/styles/inspiration/unsealedspellbook/unsealedspellbook.png',
      8369: '/perk-images/styles/inspiration/firststrike/firststrike.png'
    }
    
    if (runeIconPaths[runeId]) {
      return baseUrl + runeIconPaths[runeId]
    }
    
    // Fallback to a generic path structure
    return `${baseUrl}/perk-images/styles/${runeId}.png`
  }

  clearCache(): void {
    this.runesData = {}
    this.version = null
    
    const languages = ['en_US', 'ja_JP', 'ko_KR']
    languages.forEach(lang => {
      localStorage.removeItem(`runes_${lang}`)
      localStorage.removeItem(`runes_${lang}_timestamp`)
    })
  }
}

export const runeDataService = new RuneDataService()
export type { RuneData, RuneTreeData }