"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePreferences } from "@/hooks/use-preferences"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { preferences, setPreference } = usePreferences()
  
  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])
  
  // Initialize theme from preferences if available
  useEffect(() => {
    if (mounted) {
      if (preferences.theme) {
        setTheme(preferences.theme)
      }
    }
  }, [mounted, preferences.theme, setTheme, theme])
  
  if (!mounted) return null
  
  const isDark = theme === "dark"
  
  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark"
    setTheme(newTheme)
    setPreference("theme", newTheme)
  }
  
  return (
    <div suppressHydrationWarning>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium md:px-2 px-2 h-[34px] md:h-[34px]"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isDark ? 'Light mode' : 'Dark mode'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
