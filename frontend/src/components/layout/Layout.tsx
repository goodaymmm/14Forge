import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Home, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
// ThemeToggle removed - always dark mode
import LanguageSelector from '@/components/common/LanguageSelector'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md flex items-center justify-center text-white font-bold">
                  14
                </div>
                <span className="font-bold text-xl">14Forge</span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-4">
                <Link to="/">
                  <Button variant="ghost" size="sm">
                    <Home className="w-4 h-4 mr-2" />
                    {t('nav.home')}
                  </Button>
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <a 
                href="https://github.com/goodaymmm/14Forge" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="icon">
                  <Github className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2024 14Forge - LoL Performance Analytics Platform
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Powered by Riot Games API</span>
              <span>•</span>
              <span>BrightData Integration</span>
              <span>•</span>
              <span>14-Minute Analysis™</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout