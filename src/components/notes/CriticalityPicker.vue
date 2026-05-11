<script setup lang="ts">
import { computed } from 'vue'
import { useCssModule } from 'vue'
import type { Note, NoteCriticalitySelection } from '@/types'
import UiCriticalitySegments from '@/components/ui/UiCriticalitySegments.vue'

type Option = {
  value: NonNullable<Note['criticality']>
  label: string
}

type Props = {
  modelValue: NoteCriticalitySelection
  options: readonly Option[]
  label: string
  idPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  idPrefix: 'criticality',
})

type SegmentRow = {
  value: NonNullable<Note['criticality']>
  label: string
  tone: NonNullable<Note['criticality']>
}

const emit = defineEmits<{
  (e: 'update:modelValue', value: NoteCriticalitySelection): void
}>()

const styles = useCssModule()

const segments = computed<SegmentRow[]>(() =>
  props.options.map((o) => ({
    value: o.value,
    label: o.label,
    tone: o.value,
  })),
)
</script>

<template>
  <div :class="styles.criticalityPicker">
    <span :class="styles.criticalityLabel">{{ label }}</span>
    <UiCriticalitySegments
      :model-value="modelValue"
      :segments="segments"
      :id-prefix="idPrefix"
      :ariaLabel="label"
      @update:model-value="emit('update:modelValue', $event as NoteCriticalitySelection)"
    />
  </div>
</template>

<style lang="scss" module src="./CriticalityPicker.module.scss"></style>
