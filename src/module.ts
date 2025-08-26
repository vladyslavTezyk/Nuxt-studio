import { defineNuxtModule, createResolver, addPlugin, extendViteConfig } from '@nuxt/kit'

import { defu } from 'defu'

export default defineNuxtModule({
  meta: {
    name: 'mdc-preview',
  },
  async setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const runtime = (...args: string[]) => resolver.resolve('./runtime', ...args)

    // Add plugins
    addPlugin(runtime('./plugins/preview.client'))

    nuxt.options.vite = defu(nuxt.options.vite, {
      vue: {
        template: {
          compilerOptions: {
            isCustomElement: (tag: string) => {
              return tag === 'preview-app'
            },
          },
        },
      },
    })
    extendViteConfig((config) => {
      config.optimizeDeps ||= {}
      config.optimizeDeps.include = [
        ...(config.optimizeDeps.include || []),
        'debug',
        'extend'
      ]
    })
  },
})
