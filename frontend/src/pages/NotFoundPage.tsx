import { useNavigate } from 'react-router-dom'
import { Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Search className="w-4 h-4 mr-2" />
            Search Summoner
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage