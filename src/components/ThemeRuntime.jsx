import { useEffect } from 'react'
import { activeTheme, materializeThemeCss } from '../../shared/themeFormat.js'
import { useResolvedConfig } from '../lib/useResolvedConfig'

export function ThemeRuntime() {
  const config = useResolvedConfig()
  useEffect(() => {
    const theme = activeTheme(config?.themes)
    const root = document.documentElement
    root.dataset.publicationTheme = theme.id
    root.dataset.themeHeader = theme.layout?.header || 'default'
    root.dataset.themeFooter = theme.layout?.footer || 'default'
    root.dataset.themeArticle = theme.layout?.article || 'default'
    root.dataset.themeArchive = theme.layout?.archive || 'grid'
    let style = document.getElementById('colophon-publication-theme-runtime')
    if (!style) { style = document.createElement('style'); style.id = 'colophon-publication-theme-runtime'; document.head.appendChild(style) }
    const tokenCss = Object.entries(theme.tokens || {}).map(([key, value]) => `${key}:${value};`).join('')
    style.textContent = `:root{${tokenCss}}${materializeThemeCss(theme)}`
  }, [config?.themes])
  return null
}
