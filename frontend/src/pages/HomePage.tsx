import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SearchBar from '@/components/common/SearchBar'
import { useTranslation } from 'react-i18next'

const HomePage = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (summonerName: string, region: string) => {
    setIsSearching(true)
    navigate(`/${region}/summoner/${encodeURIComponent(summonerName)}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          {t('home.title')}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t('home.subtitle')}
        </p>
        
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-1 gap-6 mb-12 max-w-2xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-600" />
              <CardTitle>{t('home.features.fourteenMin.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('home.features.fourteenMin.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{t('home.features.fourteenMin.point1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{t('home.features.fourteenMin.point2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{t('home.features.fourteenMin.point3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{t('home.features.fourteenMin.point4')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default HomePage