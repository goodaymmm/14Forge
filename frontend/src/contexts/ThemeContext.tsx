import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use dark mode
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove light class if exists
    root.classList.remove('light')
    
    // Always add dark class
    root.classList.add('dark')
  }, [])

  // No-op functions since we're always in dark mode
  const toggleTheme = () => {
    // Do nothing - always dark mode
  }

  const setTheme = (newTheme: Theme) => {
    // Do nothing - always dark mode
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}