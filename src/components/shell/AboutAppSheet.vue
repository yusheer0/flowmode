<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'
import { openExternalUrl } from '@/utils/openExternalUrl'

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

const props = defineProps<Props>()

async function openGithub(): Promise<void> {
  await openExternalUrl(props.githubUrl)
}

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
      <p :class="styles.aboutDescription">{{ labels.aboutDescription }}</p>
      <p v-if="versionLine" :class="styles.aboutMeta">{{ versionLine }}</p>
      <UiButton variant="about" type="button" @click="openGithub">
        {{ labels.aboutGithubButton }}
      </UiButton>
    </div>
  </SheetModal>
</template>

<style lang="scss" module src="./AboutAppSheet.module.scss"></style>
