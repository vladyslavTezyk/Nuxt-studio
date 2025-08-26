import type { MDCRoot } from '@nuxtjs/mdc'

export interface ContentDraft {
  id: string
  markdown?: string
  parsed: MDCRoot
}
