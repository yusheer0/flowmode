<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'

export type AppUpdateSheetLabels = {
  modalTitle: string
  close: string
  updateCurrentVersion: string
  updateTargetVersion: string
  updateRestartHint: string
  updateDownloadProgress: string
}

type Props = {
  isOpen: boolean
  closeDisabled: boolean
  labels: AppUpdateSheetLabels
  updateStatus: string
  updateError?: string | null
  updateCurrentVersion?: string | null
  updateTargetVersion?: string | null
  updateProgress: number | null
  updateDownloadedBytes?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const styles = useMergedShellStyles()
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="[styles.modalSheet, styles.updateSheet]"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="labels.modalTitle"
    :close-title="labels.close"
    :close-disabled="closeDisabled"
    @close="emit('close')"
  >
    <p :class="styles.updateStatus">{{ updateStatus }}</p>
    <p v-if="updateError" :class="styles.updateError">{{ updateError }}</p>
    <p v-if="updateCurrentVersion" :class="styles.updateMeta">
      {{ labels.updateCurrentVersion }}: {{ updateCurrentVersion }}
    </p>
    <p v-if="updateTargetVersion" :class="styles.updateMeta">
      {{ labels.updateTargetVersion }}: {{ updateTargetVersion }}
    </p>
    <p :class="styles.updateMeta">
      {{ labels.updateRestartHint }}
    </p>
    <div v-if="updateProgress !== null" :class="styles.updateProgressWrap">
      <div :class="styles.updateProgressTrack">
        <div :class="styles.updateProgressValue" :style="{ width: `${updateProgress}%` }" />
      </div>
      <p :class="styles.updateMeta">
        {{ labels.updateDownloadProgress }}: {{ updateProgress.toFixed(0) }}%
        <span v-if="updateDownloadedBytes">({{ updateDownloadedBytes }})</span>
      </p>
    </div>
  </SheetModal>
</template>

<style lang="scss" module src="./AppUpdateSheet.module.scss"></style>
