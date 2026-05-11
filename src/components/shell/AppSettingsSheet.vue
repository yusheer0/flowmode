<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
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
        <UiButton
          variant="plain"
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.language === 'ru' },
          ]"
          @click="updateLanguage('ru')"
        >
          Русский
        </UiButton>
        <UiButton
          variant="plain"
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.language === 'en' },
          ]"
          @click="updateLanguage('en')"
        >
          English
        </UiButton>
      </div>
    </div>
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.themeSetting }}</span>
      <div :class="styles.settingsOptions">
        <UiButton
          variant="plain"
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.theme === 'light' },
          ]"
          @click="updateTheme('light')"
        >
          {{ labels.themeLight }}
        </UiButton>
        <UiButton
          variant="plain"
          type="button"
          :class="[
            styles.settingsOption,
            { [styles.settingsOptionActive]: settingsStore.settings.theme === 'dark' },
          ]"
          @click="updateTheme('dark')"
        >
          {{ labels.themeDark }}
        </UiButton>
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
        <UiButton
          variant="plain"
          type="button"
          :class="styles.settingsOption"
          :disabled="!hasCanvasBackground"
          @click="clearCanvasBackground"
        >
          {{ labels.canvasBackgroundResetButton }}
        </UiButton>
      </div>
    </div>
    <div :class="styles.settingsGroup">
      <span :class="styles.settingsLabel">{{ labels.exportDataSetting }}</span>
      <UiButton
        variant="plain"
        type="button"
        :class="styles.updateButton"
        :disabled="isExporting"
        @click="requestExport"
      >
        {{ labels.exportDataButton }}
      </UiButton>
    </div>
    <slot name="afterExport" />
  </SheetModal>
</template>
