import { ref } from 'vue'
import { createStorage } from 'unstorage'
import indexedDbDriver from 'unstorage/drivers/indexedb'
import { DatabaseItem, DraftFileItem } from '../types'
import { explainDraft, generateRecordUpdate, createCollectionDocument, generateRecordDeletion } from '../utils/collections'
import { useHost } from './useHost'
import { useGit } from './useGit'
import { generateMarkdown } from '../utils/content'


const storage = createStorage({
  driver: indexedDbDriver({
    storeName: 'nuxt-content-preview',
  }),
})

const draftFiles = ref<DraftFileItem[]>([])

export function usePreview() {
  const host = useHost()
  const git = useGit({
    owner: 'owner',
    repo: 'repo',
    branch: 'main',
    token: 'ghp_...',
    authorName: 'Name',
    authorEmail: 'email@example.com',
  })

  const draftFile = {
    get: async (id: string, { generateContent = false }: { generateContent?: boolean } = {}) => {
      const item = await storage.getItem(id) as DraftFileItem
      if (generateContent) {
        const { collection } = explainDraft(id, host.content.collections)
        const doc = createCollectionDocument(collection, id, item.document!)
        return {
          ...item,
          content: await generateMarkdown(doc) || ''
        }
      }
      return item
    },
    async upsert(id: string, item: DatabaseItem) {
      id = id.replace(/:/g, '/')
      let draft = await storage.getItem(id) as DraftFileItem
      if (!draft) {
        // Fetch github file before creating draft
        // This file will be used to prevent overwriting the file in github
        const originalGithubFile = await git.fetchFile(explainDraft(id, host.content.collections).path, { cached: true })
        const originalDatabaseItem = await host.content.getDocumentById(id)

        draft = {
          id,
          path: explainDraft(id, host.content.collections).path,
          originalDatabaseItem,
          originalGithubFile,
          status: originalGithubFile || originalDatabaseItem ? 'updated' : 'created',
          document: item
        }
      } else {
        draft.document = item
      }
      await storage.setItem(id, draft)

      // Update draftFiles
      const draftItem = draftFiles.value.find(item => item.id == id)
      if (draftItem) {
        draftItem.document = item
      } else {
        draftFiles.value.push(draft)
      }

      await applyDraftToDatabase(id, draft.document!)
      host.nuxtApp.hooks.callHookParallel('app:data:refresh')
    },
    async remove(id: string) {
      const draft = await storage.getItem(id) as DraftFileItem
      const { collection, path } = explainDraft(id, host.content.collections)
      if (draft) {
        // Do nothing if the draft is already deleted
        if (draft.status === 'deleted') {
          return
        }
        // Remove
        await storage.removeItem(id)
        await host.databaseAdapter(collection.name).exec(generateRecordDeletion(collection, id))

        if (draft.status === 'updated') {
          const deleteDraft: DraftFileItem = {
            id,
            path: draft.path,
            status: 'deleted',
            originalDatabaseItem: draft.originalDatabaseItem,
            originalGithubFile: draft.originalGithubFile
          }
          await storage.setItem(id, deleteDraft)

          if (draft.originalDatabaseItem) {
            await applyDraftToDatabase(id, draft.originalDatabaseItem)
          }
        }

      } else {
        // Fetch github file before creating draft
        // This file will be used to prevent overwriting the file in github
        const originalGithubFile = await git.fetchFile(path, { cached: true })
        const originalDatabaseItem = await host.content.getDocumentById(id)

        const deleteDraft: DraftFileItem = {
          id,
          path,
          status: 'deleted',
          originalDatabaseItem,
          originalGithubFile
        }
        await storage.setItem(id, deleteDraft)

        if (originalDatabaseItem) {
          await host.databaseAdapter(collection.name).exec(generateRecordDeletion(collection, id))
          host.nuxtApp.hooks.callHookParallel('app:data:refresh')
        }
      }

      draftFiles.value = draftFiles.value.filter(item => item.id !== id)
      host.nuxtApp.hooks.callHookParallel('app:data:refresh')
    },
    async revert(id: string) {
      const draft = await storage.getItem(id) as DraftFileItem
      if (!draft) return
      await storage.removeItem(id)

      // Update draftFiles
      draftFiles.value = draftFiles.value.filter(item => item.id !== id)

      if (draft.originalDatabaseItem) {
        await applyDraftToDatabase(id, draft.originalDatabaseItem)
      } else if (draft.status === 'created') {
        const { collection } = explainDraft(draft.id, host.content.collections)
        await host.databaseAdapter(collection.name).exec(generateRecordDeletion(collection, draft.id))
      }
      host.nuxtApp.hooks.callHookParallel('app:data:refresh')
    },
    async list () {
      const list = await storage.getKeys().then(keys => Promise.all(keys.map(key => storage.getItem(key) as unknown as DraftFileItem)))
      draftFiles.value = list
      return list
    },
    async revertAll () {
      await storage.clear()
      for (const draft of draftFiles.value) {
        const { collection } = explainDraft(draft.id, host.content.collections)
        if (draft.originalDatabaseItem) {
          await applyDraftToDatabase(draft.id, draft.originalDatabaseItem)
        } else if (draft.status === 'created') {
          await host.databaseAdapter(collection.name).exec(generateRecordDeletion(collection, draft.id))
        }
      }
      draftFiles.value = []
      host.nuxtApp.hooks.callHookParallel('app:data:refresh')
    }
  }


  async function applyDraftToDatabase(id: string, content: DatabaseItem) {
    id = id.replace(/:/g, '/')
    const { collection } = explainDraft(id, host.content.collections)
    const doc = createCollectionDocument(collection, id, content)

    await generateRecordUpdate(collection, id, doc)
      .filter(Boolean)
      .reduce(async (acc, query) => await acc.then(async () => {
        await host.databaseAdapter(collection.name).exec(query)
      }), Promise.resolve())
  }

  host.onMounted(async () => {
    const list = await draftFile.list()
    await Promise.all(list.map(async (draft) => {
      if (draft.status === 'deleted') {
        const { collection } = explainDraft(draft.id, host.content.collections)
        await host.databaseAdapter(collection.name).exec(generateRecordDeletion(collection, draft.id))
      } else {
        await applyDraftToDatabase(draft.id, draft.document!)
      }
    }))
    host.nuxtApp.hooks.callHookParallel('app:data:refresh')
  })
  host.onbeforeunload((event: BeforeUnloadEvent) => {
    // Ignore on development to prevent annoying dialogs
    if (import.meta.dev) return
    if (!draftFiles.value.length) return

    // Recommended
    event.preventDefault()
    event = event || window.event

    // For IE and Firefox prior to version 4
    if (event) {
      event.returnValue = 'Sure?'
    }

    // For Safari
    return 'Sure?'
  })

  return {
    host,
    git,
    draftFiles,
    draftFile,
    // draftMedia: {
    //   get -> DraftMediaItem
    //   upsert
    //   remove
    //   revert
    //   move
    //   list -> DraftMediaItem[]
    //   revertAll
    // }
    file: {
      list: async () => {
        const collections = Object.keys(host.content.collections).filter(c => c !== 'info')
        const contents = await Promise.all(collections.map(async (collection) => {
          const docs = await host.content.queryCollection(collection).all() as DatabaseItem[]
          return docs
        }))
        return contents.flat()
      }
    },
    // media: {
    //   list -> MediaItem[]
    // }
    // config {
    //   get -> ConfigItem
    //   update
    //   revert
    // }
  }
}