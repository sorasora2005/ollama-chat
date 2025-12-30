import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)

  const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const applyTheme = (isDark: boolean) => {
    setIsDarkMode(isDark)
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedTheme = localStorage.getItem('theme')
    let shouldBeDark: boolean

    if (savedTheme === 'dark' || savedTheme === 'light') {
      shouldBeDark = savedTheme === 'dark'
    } else {
      shouldBeDark = getSystemTheme() === 'dark'
    }

    applyTheme(shouldBeDark)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme !== 'dark' && savedTheme !== 'light') {
        applyTheme(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDarkMode
    applyTheme(newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  return { isDarkMode, toggleTheme }
}


