<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'
import { useSettingsStore } from '@/stores'

export type AppSettingsSheetLabels = {
  settingsTitle: string
  close: string
  languageSetting: string
  themeSetting: string
  themeLight: string
  themeDark: string
  canvasBackgroundSetting: string
  canvasBackgroundUploadButton: string
  canvasBackgroundResetButton: string
  canvasBackgroundApplied: string
  exportDataSetting: string
  exportDataButton: string
}

type Props = {
  isOpen: boolean
  labels: AppSettingsSheetLabels
  canvasBackgroundInputId: string
  hasCanvasBackground: boolean
  isExporting: boolean
  applyCanvasBackgroundFromEvent: (event: Event) => void
  clearCanvasBackground: () => void
}

defineProps<Props>()

const styles = useShellOnlyStyles()

const emit = defineEmits<{
  close: []
  exportRequest: []
}>()

const settingsStore = useSettingsStore()

function updateLanguage(value: 'ru' | 'en'): void {
  settingsStore.updateSettings({ language: value })
}

function updateTheme(value: 'light' | 'dark'): void {
  settingsStore.updateSettings({ theme: value })
}

function requestExport(): void {
  emit('exportRequest')
}
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="[styles.modalSheet, styles.settingsSheet]"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="labels.settingsTitle"
    :close-title="labels.close"
    @close="emit('close')"
  >
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.languageSetting }}</span>
      <div :class="styles.settingsOptions">
        <button
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.language === 'ru' },
          ]"
          @click="updateLanguage('ru')"
        >
          Русский
        </button>
        <button
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.language === 'en' },
          ]"
          @click="updateLanguage('en')"
        >
          English
        </button>
      </div>
    </div>
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.themeSetting }}</span>
      <div :class="styles.settingsOptions">
        <button
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.theme === 'light' },
          ]"
          @click="updateTheme('light')"
        >
          {{ labels.themeLight }}
        </button>
        <button
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.theme === 'dark' },
          ]"
          @click="updateTheme('dark')"
        >
          {{ labels.themeDark }}
        </button>
      </div>
    </div>
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.canvasBackgroundSetting }}</span>
      <div :class="styles.settingsOptions">
        <input
          :id="canvasBackgroundInputId"
          type="file"
          accept="image/*"
          :class="styles.hiddenInput"
          @change="applyCanvasBackgroundFromEvent($event)"
        >
        <label
          :for="canvasBackgroundInputId"
          :class="styles.settingsOption"
        >
          {{ labels.canvasBackgroundUploadButton }}
        </label>
        <button
          type="button"
          :class="styles.settingsOption"
          :disabled="!hasCanvasBackground"
          @click="clearCanvasBackground"
        >
          {{ labels.canvasBackgroundResetButton }}
        </button>
      </div>
      <p v-if="hasCanvasBackground" :class="styles.layerHint">
        {{ labels.canvasBackgroundApplied }}
      </p>
    </div>
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.exportDataSetting }}</span>
      <button
        type="button"
        :class="styles.updateButton"
        :disabled="isExporting"
        @click="requestExport"
      >
        {{ labels.exportDataButton }}
      </button>
    </div>
    <slot name="afterExport" />
  </SheetModal>
</template>
