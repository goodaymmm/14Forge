import axios, { AxiosInstance } from 'axios'
import { toast } from '@/components/ui/toaster'

class ApiClient {
  private client: AxiosInstance
  private dataDragonVersion: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response
          
          switch (status) {
            case 404:
              toast({
                title: 'Not Found',
                description: data?.error?.message || 'Resource not found',
                variant: 'destructive',
              })
              break
            case 429:
              toast({
                title: 'Rate Limited',
                description: 'Too many requests. Please wait a moment.',
                variant: 'destructive',
              })
              break
            case 500:
              toast({
                title: 'Server Error',
                description: 'Something went wrong. Please try again later.',
                variant: 'destructive',
              })
              break
          }
        } else if (error.request) {
          toast({
            title: 'Network Error',
            description: 'Unable to connect to the server',
            variant: 'destructive',
          })
        }
        
        return Promise.reject(error)
      }
    )
  }

  // Summoner endpoints
  async getSummoner(region: string, summonerName: string) {
    const response = await this.client.get(`/api/summoner/${region}/${encodeURIComponent(summonerName)}`)
    return response.data
  }

  async getSummonerByPuuid(region: string, puuid: string) {
    const response = await this.client.get(`/api/summoner/by-puuid/${region}/${puuid}`)
    return response.data
  }

  // Match endpoints
  async getMatchHistory(region: string, puuid: string, options?: { start?: number; count?: number }) {
    const params = new URLSearchParams()
    if (options?.start) params.append('start', options.start.toString())
    if (options?.count) params.append('count', options.count.toString())
    
    const response = await this.client.get(`/api/matches/${region}/${puuid}?${params}`)
    return response.data
  }

  async getMatch(region: string, matchId: string, puuid?: string) {
    const params = puuid ? `?puuid=${puuid}` : ''
    const response = await this.client.get(`/api/matches/${region}/match/${matchId}${params}`)
    return response.data
  }

  async getMatchTimeline(region: string, matchId: string) {
    const response = await this.client.get(`/api/matches/${region}/match/${matchId}/timeline`)
    return response.data
  }

  // Analysis endpoints
  async getFourteenMinAnalysis(region: string, matchId: string, force: boolean = false) {
    const params = force ? { force: 'true' } : {}
    const response = await this.client.get(`/api/analysis/14min/${region}/${matchId}`, { params })
    return response.data
  }

  async batchAnalyzeMatches(matches: Array<{ region: string; matchId: string }>) {
    const response = await this.client.post('/api/analysis/14min/batch', { matches })
    return response.data
  }

  // Meta endpoints
  async getMetaData(region: string) {
    const response = await this.client.get(`/api/meta/${region}`)
    return response.data
  }

  async getChampions(region: string) {
    const response = await this.client.get(`/api/meta/${region}/champions`)
    return response.data
  }

  async getTrendingTopics() {
    const response = await this.client.get('/api/meta/trends/current')
    return response.data
  }

  // BrightData endpoints (Phase 2)
  async getMultiSourceData(championId: string, region: string) {
    const response = await this.client.get(`/api/brightdata/champion/${championId}`, {
      params: { region, sources: 'opgg,ugg,mobalytics' }
    })
    return response.data
  }

  async getMetaPrediction() {
    const response = await this.client.get('/api/brightdata/meta-prediction')
    return response.data
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health')
    return response.data
  }

  // Data Dragon CDN helpers
  async getDataDragonVersion(): Promise<string> {
    if (!this.dataDragonVersion) {
      try {
        const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
        this.dataDragonVersion = response.data[0]
      } catch (error) {
        console.error('Failed to fetch Data Dragon version:', error)
        this.dataDragonVersion = '14.15.1' // Fallback version
      }
    }
    return this.dataDragonVersion || '14.15.1'
  }

  async getProfileIconUrl(profileIconId: number): Promise<string> {
    const version = await this.getDataDragonVersion()
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`
  }

  async getChampionIconUrl(championName: string): Promise<string> {
    const version = await this.getDataDragonVersion()
    
    // Special case mappings for champion names
    const championNameMap: Record<string, string> = {
      'FiddleSticks': 'Fiddlesticks',
      'Fiddlesticks': 'Fiddlesticks',
      'Wukong': 'MonkeyKing',
      'RenataGlasc': 'Renata'
    }
    
    // Use mapped name if exists, otherwise use original
    const mappedName = championNameMap[championName] || championName
    
    // For Yunara, try the original name first
    // If it's not in Data Dragon, the onError handler in img tag will handle it
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${mappedName}.png`
    
    // Return URL - browser will handle 404 with onError in img tag
    return url
  }

  async getLocalizedChampionName(championName: string, language: string): Promise<string> {
    try {
      const version = await this.getDataDragonVersion()
      const locale = language === 'ja' ? 'ja_JP' : language === 'ko' ? 'ko_KR' : 'en_US'
      
      // Cache key for localized champion data
      const cacheKey = `champion_data_${locale}_${version}`
      let championData = localStorage.getItem(cacheKey)
      
      if (!championData) {
        const response = await axios.get(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}/champion.json`
        )
        championData = JSON.stringify(response.data.data)
        localStorage.setItem(cacheKey, championData)
      }
      
      const data = JSON.parse(championData)
      const champion = data[championName]
      return champion?.name || championName
    } catch (error) {
      console.error('Failed to fetch localized champion name:', error)
      return championName // Fallback to English name
    }
  }

  async getChampionNameLocalized(championName: string): Promise<string> {
    // Get current language from localStorage or default to 'en'
    const language = localStorage.getItem('language') || 'en'
    return this.getLocalizedChampionName(championName, language)
  }

  async getItemIconUrl(itemId: number): Promise<string> {
    const version = await this.getDataDragonVersion()
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`
  }

  async getSummonerSpellIconUrl(spellId: number): Promise<string> {
    const version = await this.getDataDragonVersion()
    // Map spell IDs to names
    const spellMap: { [key: number]: string } = {
      4: 'SummonerFlash',
      6: 'SummonerHaste',
      7: 'SummonerHeal',
      11: 'SummonerSmite',
      12: 'SummonerTeleport',
      13: 'SummonerMana',
      14: 'SummonerDot',
      21: 'SummonerBarrier',
      3: 'SummonerExhaust',
      1: 'SummonerBoost',
      32: 'SummonerSnowball'
    }
    const spellName = spellMap[spellId] || 'SummonerFlash'
    return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellName}.png`
  }

  async getRuneIconUrl(runeId: number): Promise<string> {
    // Use OP.GG's CDN for rune icons - simpler and more reliable
    // OP.GG format: direct ID mapping
    // For stat shards, use the specific stat shard URL
    if (runeId >= 5000 && runeId <= 5013) {
      return this.getStatShardIconUrl(runeId)
    }
    return `https://opgg-static.akamaized.net/meta/images/lol/latest/perk/${runeId}.png`
  }

  async getRuneStyleIconUrl(styleId: number): Promise<string> {
    // Rune style (tree) icons
    // Style IDs: 8000 (Precision), 8100 (Domination), 8200 (Sorcery), 8300 (Resolve), 8400 (Inspiration)
    return `https://opgg-static.akamaized.net/meta/images/lol/latest/perkStyle/${styleId}.png`
  }

  async getStatShardIconUrl(shardId: number): Promise<string> {
    // Stat shard icons - use direct perk URLs which work better
    // These stat shard IDs work with the regular perk URL format
    return `https://opgg-static.akamaized.net/meta/images/lol/latest/perk/${shardId}.png`
  }

  async getChampionSkillIconUrl(championKey: string, skillSlot: string): Promise<string> {
    // Get champion skill icons from Data Dragon
    // skillSlot: Q, W, E, R, or passive
    const version = await this.getDataDragonVersion()
    const slotMap: { [key: string]: number } = {
      'P': 0, 'passive': 0,
      'Q': 1, 'q': 1,
      'W': 2, 'w': 2,
      'E': 3, 'e': 3,
      'R': 4, 'r': 4
    }
    
    const slotIndex = slotMap[skillSlot] ?? 1
    
    try {
      // First get champion data to find spell images
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${championKey}.json`)
      const data = await response.json()
      const champion = data.data[championKey]
      
      if (champion && champion.spells && champion.spells[slotIndex - 1]) {
        const spellImage = champion.spells[slotIndex - 1].image.full
        return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellImage}`
      }
    } catch (error) {
      console.error('Failed to fetch champion skill icon:', error)
    }
    
    // Fallback - return a placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23374151" rx="4"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23fff" font-size="20"%3E' + skillSlot + '%3C/text%3E%3C/svg%3E'
  }

  async getRuneIconUrlOld(runeId: number): Promise<string> {
    // Old Community Dragon mapping - kept for reference
    const runePathMap: { [key: string]: string } = {
      // Precision Keystones
      '8005': 'Precision/PressTheAttack/PressTheAttack',
      '8008': 'Precision/LethalTempo/LethalTempoTemp',
      '8021': 'Precision/FleetFootwork/FleetFootwork',
      '8010': 'Precision/Conqueror/Conqueror',
      // Precision Minor
      '9101': 'Precision/Overheal',
      '9111': 'Precision/Triumph',
      '8009': 'Precision/PresenceOfMind/PresenceOfMind',
      '9104': 'Precision/LegendAlacrity/LegendAlacrity',
      '9105': 'Precision/LegendTenacity/LegendTenacity',
      '9103': 'Precision/LegendBloodline/LegendBloodline',
      '8014': 'Precision/CoupDeGrace/CoupDeGrace',
      '8017': 'Precision/CutDown/CutDown',
      '8299': 'Precision/LastStand/LastStand',
      
      // Domination Keystones
      '8112': 'Domination/Electrocute/Electrocute',
      '8124': 'Domination/Predator/Predator',
      '8128': 'Domination/DarkHarvest/DarkHarvest',
      '9923': 'Domination/HailOfBlades/HailOfBlades',
      // Domination Minor
      '8126': 'Domination/CheapShot/CheapShot',
      '8139': 'Domination/TasteOfBlood/GreenTerror_TasteOfBlood',
      '8143': 'Domination/SuddenImpact/SuddenImpact',
      '8136': 'Domination/ZombieWard/ZombieWard',
      '8120': 'Domination/GhostPoro/GhostPoro',
      '8138': 'Domination/EyeballCollection/EyeballCollection',
      '8135': 'Domination/RavenousHunter/RavenousHunter',
      '8134': 'Domination/IngeniousHunter/IngeniousHunter',
      '8105': 'Domination/RelentlessHunter/RelentlessHunter',
      '8106': 'Domination/UltimateHunter/UltimateHunter',
      
      // Sorcery Keystones
      '8214': 'Sorcery/SummonAery/SummonAery',
      '8229': 'Sorcery/ArcaneComet/ArcaneComet',
      '8230': 'Sorcery/PhaseRush/PhaseRush',
      // Sorcery Minor
      '8224': 'Sorcery/NullifyingOrb/Pokeshield',
      '8226': 'Sorcery/ManaflowBand/ManaflowBand',
      '8275': 'Sorcery/NimbusCloak/6361',
      '8210': 'Sorcery/Transcendence/Transcendence',
      '8234': 'Sorcery/Celerity/CelerityTemp',
      '8233': 'Sorcery/AbsoluteFocus/AbsoluteFocus',
      '8237': 'Sorcery/Scorch/Scorch',
      '8232': 'Sorcery/Waterwalking/Waterwalking',
      '8236': 'Sorcery/GatheringStorm/GatheringStorm',
      
      // Resolve Keystones
      '8437': 'Resolve/GraspOfTheUndying/GraspOfTheUndying',
      '8439': 'Resolve/Aftershock/VeteranAftershock',
      '8465': 'Resolve/Guardian/Guardian',
      // Resolve Minor
      '8446': 'Resolve/Demolish/Demolish',
      '8463': 'Resolve/FontOfLife/FontOfLife',
      '8401': 'Resolve/ShieldBash/MirrorShell_ShieldBash',
      '8429': 'Resolve/Conditioning/Conditioning',
      '8444': 'Resolve/SecondWind/SecondWind',
      '8473': 'Resolve/BonePlating/BonePlating',
      '8451': 'Resolve/Overgrowth/Overgrowth',
      '8453': 'Resolve/Revitalize/Revitalize',
      '8242': 'Resolve/Unflinching/Unflinching',
      
      // Inspiration Keystones
      '8351': 'Inspiration/GlacialAugment/GlacialAugment',
      '8360': 'Inspiration/UnsealedSpellbook/UnsealedSpellbook',
      '8369': 'Inspiration/FirstStrike/FirstStrike',
      // Inspiration Minor
      '8306': 'Inspiration/HextechFlashtraption/HextechFlashtraption',
      '8304': 'Inspiration/MagicalFootwear/MagicalFootwear',
      '8313': 'Inspiration/PerfectTiming/PerfectTiming',
      '8321': 'Inspiration/FuturesMarket/FuturesMarket',
      '8316': 'Inspiration/MinionDematerializer/MinionDematerializer',
      '8345': 'Inspiration/BiscuitDelivery/BiscuitDelivery',
      '8347': 'Inspiration/CosmicInsight/CosmicInsight',
      '8410': 'Inspiration/ApproachVelocity/ApproachVelocity',
      '8352': 'Inspiration/TimeWarpTonic/TimeWarpTonic'
    }
    
    const path = runePathMap[runeId.toString()]
    if (path) {
      return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/Styles/${path}.png`
    }
    
    // Stat Shards mapping
    const statShardMap: { [key: string]: string } = {
      // Offense (Row 1)
      '5008': 'StatMods/StatModsAdaptiveForceIcon', // +9 Adaptive Force
      '5005': 'StatMods/StatModsAttackSpeedIcon', // +10% Attack Speed
      '5007': 'StatMods/StatModsCDRScalingIcon', // +8 Ability Haste
      
      // Flex (Row 2)
      '5008f': 'StatMods/StatModsAdaptiveForceIcon', // +9 Adaptive Force (Flex)
      '5002': 'StatMods/StatModsArmorIcon', // +6 Armor
      '5003': 'StatMods/StatModsMagicResIcon', // +8 Magic Resist
      
      // Defense (Row 3)
      '5001': 'StatMods/StatModsHealthScalingIcon', // +15-140 HP (based on level)
      '5002d': 'StatMods/StatModsArmorIcon', // +6 Armor (Defense)
      '5003d': 'StatMods/StatModsMagicResIcon', // +8 Magic Resist (Defense)
      '5011': 'StatMods/StatModsHealthScalingIcon', // +15-140 HP
      '5013': 'StatMods/StatModsTenacityIcon' // Tenacity
    }
    
    const statPath = statShardMap[runeId.toString()]
    if (statPath) {
      return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/${statPath}.png`
    }
    
    // Fallback for unknown runes
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Ccircle cx="32" cy="32" r="28" fill="%23374151" opacity="0.5"/%3E%3C/svg%3E'
  }

  getEmptyItemSlotUrl(): string {
    // Using a transparent placeholder for empty slots
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23374151" opacity="0.5" rx="4"/%3E%3C/svg%3E'
  }

  getRankEmblemUrl(tier: string, _rank?: string): string {
    // Using OP.GG's high-resolution rank emblems
    const tierLower = tier?.toLowerCase() || 'unranked'
    // OP.GG format with 144px width for better quality
    return `https://opgg-static.akamaized.net/images/medals_new/${tierLower}.png?image=q_auto:good,f_png,w_144&v=1754889235`
  }
}

export const apiClient = new ApiClient()