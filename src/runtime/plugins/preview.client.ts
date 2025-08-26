import { defineNuxtPlugin, getAppManifest } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Disable prerendering for preview
  const manifest = await getAppManifest()
  manifest.prerendered = []

  // preview/admin login logic

  nuxtApp.hook('app:mounted', async () => {
    await import('../utils/mountPreviewUI').then(({ mountPreviewUI }) => {
      mountPreviewUI()
    })
  })
})
