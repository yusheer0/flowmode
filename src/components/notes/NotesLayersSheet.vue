<script setup lang="ts">
import { computed, inject } from 'vue'
import { X } from 'lucide-vue-next'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SheetModal from '@/components/SheetModal.vue'
import { useNotesStore, useSettingsStore } from '@/stores'
import { useNotesLayers } from '@/composables/useNotesLayers'
import { TRANSLATIONS } from '@/translations/translations'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'
import { NOTES_SHEETS_KEY } from '@/components/notes/notesInjection'

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const sheets = inject(NOTES_SHEETS_KEY)
if (!sheets) {
  throw new Error('NotesLayersSheet must be mounted under NotesDialogs (NOTES_SHEETS_KEY)')
}

const { isLayerModalOpen } = sheets

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

const {
  newLayerName,
  layerFormError,
  customLayersCount,
  canCreateCustomLayer,
  canSubmitLayer,
  hasNoLayers,
  isLayerDeleteConfirmModalOpen,
  openLayerModal,
  closeLayerModal,
  selectLayer,
  createLayer,
  deleteLayer,
  confirmDeleteLayer,
  closeDeleteLayerConfirm,
} = useNotesLayers(notesStore, t, sheets.openLayerModal, sheets.closeLayerModal)

const labels = computed(() => ({
  layersTitle: t('layersTitle'),
  close: t('close'),
  deleteLayerTitle: t('deleteButton'),
  layersCount: t('layersCount'),
  newLayerPlaceholder: t('newLayerPlaceholder'),
  createLayerButton: t('createButton'),
  customLayerLimitReached: t('customLayerLimitReached'),
  layerDeleteConfirmTitle: t('layerDeleteConfirmTitle'),
  layerDeleteConfirmMessage: t('layerDeleteConfirmMessage'),
  cancelButton: t('cancelButton'),
  deleteButton: t('deleteButton'),
}))

const styles = useMergedShellStyles()

function onLayerNameInput(event: Event): void {
  newLayerName.value = (event.target as HTMLInputElement).value
}

defineExpose({
  openLayerModal,
  closeLayerModal,
  hasNoLayers,
})
</script>

<template>
  <SheetModal
    :is-open="isLayerModalOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="[styles.modalSheet, styles.layerSheet]"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="labels.layersTitle"
    :close-title="labels.close"
    @close="closeLayerModal"
  >
    <div :class="styles.layerButtons">
      <div
        v-for="layer in notesStore.layers"
        :key="layer.id"
      >
        <div :class="styles.layerRow">
          <button
            :class="[
              styles.layerOption,
              { [styles.layerOptionActive]: layer.id === notesStore.activeLayerId },
            ]"
            type="button"
            @click="selectLayer(layer.id)"
          >
            {{ layer.name }}
          </button>
          <button
            :class="styles.layerDeleteButton"
            type="button"
            :title="labels.deleteLayerTitle"
            :disabled="notesStore.layers.length <= 1"
            @click="deleteLayer(layer.id)"
          >
            <X :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div :class="styles.layerCreate">
      <span :class="styles.layerCreateLabel">
        {{ labels.layersCount }}: {{ customLayersCount }}/{{ notesStore.MAX_CUSTOM_LAYERS }}
      </span>
      <div :class="styles.layerCreateControls">
        <input
          :value="newLayerName"
          type="text"
          :class="styles.layerCreateInput"
          :disabled="!canCreateCustomLayer"
          :placeholder="labels.newLayerPlaceholder"
          @input="onLayerNameInput"
          @keydown.enter.prevent="createLayer"
        >
        <button
          :class="styles.layerCreateButton"
          type="button"
          :disabled="!canSubmitLayer"
          @click="createLayer"
        >
          {{ labels.createLayerButton }}
        </button>
      </div>
      <p v-if="!canCreateCustomLayer" :class="styles.layerHint">
        {{ labels.customLayerLimitReached }}
      </p>
      <p v-if="layerFormError" :class="styles.layerError">{{ layerFormError }}</p>
    </div>
  </SheetModal>

  <ConfirmSheet
    :is-open="isLayerDeleteConfirmModalOpen"
    :title="labels.layerDeleteConfirmTitle"
    :message="labels.layerDeleteConfirmMessage"
    :cancel-label="labels.cancelButton"
    :confirm-label="labels.deleteButton"
    @close="closeDeleteLayerConfirm"
    @cancel="closeDeleteLayerConfirm"
    @confirm="confirmDeleteLayer"
  />
</template>

<style lang="scss" module src="./NotesLayersSheet.module.scss"></style>
