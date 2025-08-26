export default defineNuxtConfig({
  modules: [
    '@nuxt/ui-pro',
    '../src/module',
    '@nuxt/content'
  ],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  compatibilityDate: '2025-08-26',
  content: {
    experimental: {
      sqliteConnector: 'native'
    },

    preview: {
      dev: true,
      api: 'http://localhost:3000',
    }
  }
})
