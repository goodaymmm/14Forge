import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface SearchBarProps {
  onSearch: (summonerName: string, region: string) => void
  isLoading?: boolean
  className?: string
}

const REGIONS = [
  { code: 'na1', display: 'NA', name: 'North America' },
  { code: 'euw1', display: 'EUW', name: 'Europe West' },
  { code: 'eun1', display: 'EUNE', name: 'Europe Nordic & East' },
  { code: 'kr', display: 'KR', name: 'Korea' },
  { code: 'jp1', display: 'JP', name: 'Japan' },
  { code: 'br1', display: 'BR', name: 'Brazil' },
  { code: 'la1', display: 'LAN', name: 'Latin America North' },
  { code: 'la2', display: 'LAS', name: 'Latin America South' },
  { code: 'oc1', display: 'OCE', name: 'Oceania' },
  { code: 'ru', display: 'RU', name: 'Russia' },
  { code: 'tr1', display: 'TR', name: 'Turkey' },
]

const SearchBar = ({ onSearch, isLoading = false, className }: SearchBarProps) => {
  const { t } = useTranslation()
  const [summonerName, setSummonerName] = useState('')
  const [selectedRegion, setSelectedRegion] = useState(() => {
    // Load region from localStorage or default to 'na1'
    return localStorage.getItem('selectedRegion') || 'na1'
  })
  
  // Save region to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedRegion', selectedRegion)
  }, [selectedRegion])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (summonerName.trim()) {
      onSearch(summonerName.trim(), selectedRegion)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="flex gap-2">
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isLoading}
        >
          {REGIONS.map((region) => (
            <option key={region.code} value={region.code}>
              {region.display}
            </option>
          ))}
        </select>
        
        <div className="relative flex-1">
          <input
            type="text"
            value={summonerName}
            onChange={(e) => setSummonerName(e.target.value)}
            placeholder={t('summoner.searchPlaceholder')}
            className="w-full px-4 py-2 pr-10 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
        </div>
        
        <Button type="submit" disabled={isLoading || !summonerName.trim()}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="ml-2">{t('common.search')}</span>
        </Button>
      </div>
    </form>
  )
}

export default SearchBar