import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'theme-mode'

export type ThemeMode = 'light' | 'dark'

/**
 * 夜间模式状态管理 hook。
 * 优先级：localStorage > 默认浅色。
 * localStorage 不可用时降级为内存态，不报错不阻塞。
 */
export function useDarkMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const initial = getInitialThemeMode()
    applyDarkMode(initial)
    return initial
  })

  useEffect(() => {
    applyDarkMode(mode)
  }, [mode])

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage 不可用时降级为内存态，不报错
      }
      return next
    })
  }, [])

  return { mode, toggle }
}

function getInitialThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
  } catch {
    // localStorage 不可用时降级为默认浅色
  }
  return 'light'
}

function applyDarkMode(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
