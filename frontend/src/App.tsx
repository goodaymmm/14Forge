import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import SummonerPage from '@/pages/SummonerPage'
import MatchPage from '@/pages/MatchPage'
import MetaPage from '@/pages/MetaPage'
import TrendsPage from '@/pages/TrendsPage'
import ContestPage from '@/pages/ContestPage'
import NotFoundPage from '@/pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/:region/summoner/:summonerName" element={<SummonerPage />} />
              <Route path="/:region/match/:matchId" element={<MatchPage />} />
              <Route path="/:region/meta" element={<MetaPage />} />
              <Route path="/trends" element={<TrendsPage />} />
              <Route path="/contest" element={<ContestPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App