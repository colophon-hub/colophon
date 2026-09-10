import { useMemo } from 'react'
import { useResolvedConfig } from '../lib/useResolvedConfig'
import { buildCustomFontFaceCss, fontStackForRole } from '../../shared/publicTypographyModel.js'

export function PublicTypographyRuntime() {
  const config = useResolvedConfig()
  const css = useMemo(() => {
    const appearance = config?.appearance || {}
    const faces = buildCustomFontFaceCss(appearance)
    const variables = [
      `--font-display:${fontStackForRole(appearance, 'display')}`,
      `--font-heading:${fontStackForRole(appearance, 'heading')}`,
      `--font-body:${fontStackForRole(appearance, 'body')}`,
      `--font-ui:${fontStackForRole(appearance, 'navigation')}`,
    ].join(';')
    return `${faces}\n:root{${variables};--headline-font:var(--font-heading);--body-font:var(--font-body);--accent-font:var(--font-display);}`
  }, [config?.appearance])

  return <style data-public-typography>{css}</style>
}
