<script setup lang="ts">
import { ref, watch, computed, reactive } from 'vue'
import PreviewEditor from './components/PreviewEditor.vue'
import ContentsListModal from './components/ContentsListModal.vue'
import { usePreview } from './composables/usePreview'

const { host, draftFile, draftFiles } = usePreview()

const activeContents = ref<{ id: string, label: string, value: string }[]>([])

const toolbarWrapper = ref<HTMLElement | null>(null)

const selectedContentId = ref<string | null>(null)
const selectedContent = ref<any | null>(null)

const ui = reactive({
  editorVisibility: false,
  commitPreviewVisibility: false,
  contentsListVisibility: false,
})

const contentItems = computed(() => {
  const items = []
  if (activeContents.value.length > 0) {
    items.unshift(
      ...activeContents.value,
    )
  }

  items.push({
    id: 'show-all-contents',
    label: 'Show all contents',
    value: 'show-all-contents',
    onSelect: () => {
      ui.contentsListVisibility = true
    },
  })

  return items
})

const isLeftSidebarOpen = computed(() => {
  return ui.editorVisibility
})
const ongoingDrafts = computed(() => {
  return draftFiles.value.map((draft) => {
    return {
      id: draft.id,
      label: draft.id,
      value: draft.id,
      onSelect: () => {
        onContentSelect(draft.id)
      },
    }
  })
})

watch(isLeftSidebarOpen, (value) => {
  if (value) {
    host.ui.pushBodyToLeft()
  }
  else {
    host.ui.pullBodyToRight()
  }
})

async function onContentSelect(id: string) {
  selectedContentId.value = id
  selectedContent.value = await host.content.getDocumentById(id)
  ui.editorVisibility = true
}
function onEditorUpdate(content: any) {
  draftFile.upsert(selectedContentId.value!, content)
}
function onRevert() {
  draftFile.revert(selectedContentId.value!)
}

function detectRenderedContents() {
  activeContents.value = host.detectRenderedContents().map((content) => {
    return {
      id: content.id,
      label: content.title,
      value: content.id,
      onSelect: () => {
        onContentSelect(content.id)
      },
    }
  })
}

host.onMounted(() => {
  detectRenderedContents()
  const router = (host.nuxtApp as any).$router
  router?.afterEach?.(() => {
    setTimeout(() => {
      detectRenderedContents()
    }, 100)
  })
})

</script>

<template>
  <Suspense>
    <UApp :toaster="{ portal: false }">
      <div
        id="root"
        class="dark"
      >
        <div>
          <div ref="toolbarWrapper"
            class="toolbar-wrapper"
            style=" transition: all 0.3s ease; height: 60px;"
          >
            <div
              id="__nuxt_preview_toolbar_placeholder"
              part="toolbar-placeholder"
            >
&nbsp;
            </div>
            <div
              id="__nuxt_preview_toolbar"
              part="toolbar"
              class="relative"
            >
              <div class="flex gap-2">
                <UDropdownMenu
                  :portal="false"
                  :items="contentItems"
                  placeholder="Select a content"
                >
                  <UButton
                    label="Contents"
                    icon="i-lucide-menu"
                    color="neutral"
                    variant="solid"
                  />
                </UDropdownMenu>
                <UDropdownMenu
                  :portal="false"
                  :items="activeContents"
                  placeholder="Select a content"
                >
                  <UButton
                    label="Open"
                    icon="i-lucide-menu"
                    color="neutral"
                    variant="solid"
                  />
                </UDropdownMenu>
                <UDropdownMenu
                  v-if="draftFiles.length"
                  :portal="false"
                  :items="ongoingDrafts"
                  placeholder="Select a content"
                >
                  <UButton
                    icon="i-lucide-menu"
                    color="neutral"
                    variant="solid"
                  >
                    {{ draftFiles.length ? `Drafts (${draftFiles.length})` : 'No Drafts' }}
                  </UButton>
                </UDropdownMenu>
              </div>

              <UButton
                label="Save Changes"
                color="primary"
                variant="solid"
                :disabled="!draftFiles.length"
                @click="ui.commitPreviewVisibility = true"
              />
            </div>
          </div>

          <PreviewEditor
            v-model="ui.editorVisibility"
            :content="selectedContent"
            :markdown="'selectedContent.markdown'"
            @update:content="onEditorUpdate"
            @revert="onRevert"
          />
          <CommitPreviewModal
            v-model="ui.commitPreviewVisibility"
          />
          <ContentsListModal
            v-model="ui.contentsListVisibility"
            @update:content="onEditorUpdate"
            @select="onContentSelect"
          />
        </div>
      </div>
    </UApp>
  </Suspense>
  <!-- </div> -->
</template>
