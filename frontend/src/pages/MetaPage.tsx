import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/services/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const MetaPage = () => {
  const { region } = useParams()

  const { data: meta, isLoading } = useQuery({
    queryKey: ['meta', region],
    queryFn: () => apiClient.getMetaData(region!),
    enabled: !!region,
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {region?.toUpperCase()} Meta Analysis
        </h1>
        <p className="text-muted-foreground">
          Current patch: {meta?.data?.patch || 'Loading...'}
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="mb-6 border-yellow-500 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <CardTitle>BrightData Integration Coming Soon</CardTitle>
          </div>
          <CardDescription>
            Multi-source meta analysis from OP.GG, U.GG, and Mobalytics will be available in Phase 2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This feature will provide:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Statistical variance analysis between sources</li>
            <li>• Consensus tier ratings</li>
            <li>• Build path comparisons</li>
            <li>• Real-time meta shifts detection</li>
          </ul>
        </CardContent>
      </Card>

      {/* Placeholder Tier List */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <CardTitle>Champion Tier List</CardTitle>
            </div>
            <CardDescription>
              Top performing champions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['S', 'A', 'B'].map(tier => (
                <div key={tier}>
                  <div className={`tier-badge tier-badge-${tier === 'S' ? 'gold' : tier === 'A' ? 'platinum' : 'silver'} mb-2`}>
                    Tier {tier}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Data loading...
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <CardTitle>Rising Champions</CardTitle>
            </div>
            <CardDescription>
              Champions gaining popularity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Trend data will be available after BrightData integration
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MetaPage