import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/services/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'

const TrendsPage = () => {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: () => apiClient.getTrendingTopics(),
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trending Topics</h1>
        <p className="text-muted-foreground">
          Real-time meta trends from Reddit, Twitter, and gaming communities
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Card className="mb-6 border-yellow-500 bg-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <CardTitle>Real-time Trend Detection Coming Soon</CardTitle>
          </div>
          <CardDescription>
            BrightData-powered trend detection will be available in Phase 2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This feature will monitor:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Reddit r/leagueoflegends discussions</li>
            <li>• Twitter/X League community</li>
            <li>• Korean Inven forums</li>
            <li>• Chinese Weibo posts</li>
            <li>• Pro player stream highlights</li>
          </ul>
        </CardContent>
      </Card>

      {/* Trends List */}
      {trends?.data && trends.data.length > 0 ? (
        <div className="space-y-4">
          {trends.data.map((trend: any, idx: number) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-5 h-5 ${
                      trend.status === 'rising' ? 'text-green-500' : 
                      trend.status === 'falling' ? 'text-red-500' : 
                      'text-yellow-500'
                    }`} />
                    <CardTitle>{trend.name}</CardTitle>
                    {trend.status === 'rising' && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                        HOT
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <CardDescription>
                  {trend.mentions} mentions • {trend.sources?.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Score: {trend.trend_score}</span>
                  {trend.increase && (
                    <span className={trend.increase > 0 ? 'text-green-600' : 'text-red-600'}>
                      {trend.increase > 0 ? '+' : ''}{trend.increase}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No trending topics available. Check back later!
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TrendsPage