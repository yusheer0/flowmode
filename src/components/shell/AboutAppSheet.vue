<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'

export type AboutAppSheetLabels = {
  aboutTitle: string
  close: string
  aboutDescription: string
  aboutGithubButton: string
}

type Props = {
  isOpen: boolean
  labels: AboutAppSheetLabels
  githubUrl: string
  /** Meta line rendered above the description when set (e.g. version info on Notes screen). */
  versionLine?: string
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
    :sheet-class="[styles.modalSheet, styles.aboutSheet]"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="labels.aboutTitle"
    :close-title="labels.close"
    @close="emit('close')"
  >
    <div :class="styles.aboutContent">
      <p v-if="versionLine" :class="styles.aboutMeta">{{ versionLine }}</p>
      <p :class="styles.aboutDescription">{{ labels.aboutDescription }}</p>
      <a
        :class="styles.aboutGithubButton"
        :href="githubUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ labels.aboutGithubButton }}
      </a>
    </div>
  </SheetModal>
</template>

<style lang="scss" module src="./AboutAppSheet.module.scss"></style>
