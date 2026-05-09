<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { Layers3, Search, Cog, SquarePlus, Grid2x2, Box } from 'lucide-vue-next'
import NoteCard from '@/components/notes/NoteCard.vue'
import NotesDialogs from '@/components/notes/NotesDialogs.vue'
import { useNotesStore, useSettingsStore } from '@/stores'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { TRANSLATIONS } from '@/translations/translations'
import { getNoteBackground } from '@/utils/noteVisuals'
import { useViewPageStyles } from '@/composables/useViewPageStyles'
import { useNotesSearchFilter } from '@/composables/useNotesSearchFilter'

const styles = useViewPageStyles()

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const dialogsRef = ref<InstanceType<typeof NotesDialogs> | null>(null)

const searchQuery = ref('')

const sortedNotes = computed(() => notesStore.sortNotes(notesStore.getActiveNotesByLayer(), 'important'))
const { filteredNotes } = useNotesSearchFilter(searchQuery, sortedNotes)

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

const {
  canvasStyle,
} = useCanvasBackground(t)

const activeLayerLabel = computed(() => {
  return notesStore.getLayerName(notesStore.activeLayerId) || t('noLayerSelected')
})

onMounted(async () => {
  await Promise.all([settingsStore.init(), notesStore.init()])
  await nextTick()
  await dialogsRef.value?.bootstrapPostInit()
})
</script>

<template>
  <section :class="styles.notesView">
    <div :class="styles.canvas" :style="canvasStyle">
      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        :styles="styles"
        :background-color="getNoteBackground(note)"
        :pin-title="t('pinNoteTitle')"
        :delete-title="t('deleteNoteTitle')"
        @edit="(n) => dialogsRef?.openEditModal(n)"
        @toggle-important="notesStore.toggleImportant"
        @delete="(id) => dialogsRef?.promptDeleteNote(id)"
      />
    </div>

    <NotesDialogs ref="dialogsRef" v-model:search-query="searchQuery" />

    <nav :class="styles.bottomDock">
      <button
        :class="styles.dockButton"
        type="button"
        :title="notesStore.layers.length === 0 ? t('createLayerFirstHint') : t('newNoteTitle')"
        :disabled="notesStore.layers.length === 0"
        @click="dialogsRef?.openCreateFlow()"
      >
        <SquarePlus :size="24" />
      </button>
      <button
        :class="[styles.dockButton, { [styles.dockButtonActive]: dialogsRef?.isSearchModalOpen }]"
        type="button"
        :title="t('searchTitle')"
        @click="dialogsRef?.openSearchModal()"
      >
        <Search :size="24" />
      </button>
      <button
        :class="[styles.dockButton, { [styles.dockButtonActive]: dialogsRef?.isViewPickerModalOpen }]"
        type="button"
        title="View"
        @click="dialogsRef?.openViewPickerModal()"
      >
        <Grid2x2 :size="24" />
      </button>
      <button
        :class="[styles.dockButton, { [styles.dockButtonActive]: dialogsRef?.isSettingsModalOpen }]"
        type="button"
        :title="t('settingsTitle')"
        @click="dialogsRef?.openSettingsModal()"
      >
        <Cog :size="24" />
      </button>
      <button
        :class="[styles.dockButton, { [styles.dockButtonActive]: dialogsRef?.isAboutModalOpen }]"
        type="button"
        :title="t('aboutTitle')"
        @click="dialogsRef?.openAboutModal()"
      >
        <Box :size="24" />
      </button>
    </nav>

    <div :class="styles.layerStatusDock">
      <button
        type="button"
        :class="[
          styles.layerStatusWrapper,
          { [styles.layerStatusWrapperActive]: dialogsRef?.isLayerSheetOpen },
        ]"
        :title="`${t('layerTitle')}: ${activeLayerLabel}`"
        @click="dialogsRef?.openLayers()"
      >
        <Layers3 :size="20" color="currentColor" />
        <strong :class="styles.layerStatusValue">{{ activeLayerLabel }}</strong>
      </button>
    </div>
  </section>
</template>

<style lang="scss" module src="./NotesWorkspace.module.scss"></style>
