import Classic from './templates/Classic.js'
import Minimal from './templates/Minimal.js'
import Modern from './templates/Modern.js'
import type { TemplateBase, TemplateProps } from './templates/types.js'

type TemplateComponent = (props: TemplateProps) => ReturnType<typeof Classic>

const REGISTRY: Record<TemplateBase, TemplateComponent> = {
  classic: Classic,
  modern: Modern,
  minimal: Minimal,
}

export const getTemplate = (base: TemplateBase): TemplateComponent => {
  const c = REGISTRY[base]
  if (!c) throw new Error(`Unknown template base: ${base}`)
  return c
}

export const isTemplateBase = (value: unknown): value is TemplateBase =>
  value === 'classic' || value === 'modern' || value === 'minimal'

export const TEMPLATE_BASES: TemplateBase[] = ['classic', 'modern', 'minimal']
