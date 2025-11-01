// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-12-01',
  devtools: { enabled: true },
  css: ['~/assets/main.css', 'highlight.js/styles/github.css'],
  runtimeConfig: {
    public: { apiBase: process.env.API_BASE || 'http://localhost:3001/api' }
  },
  app: {
    head: {
      title: 'AquaShare',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  }
})
