<script setup lang="ts">
import { useCssModule } from 'vue'
import type { Note } from '@/types'

type CriticalityValue = Note['criticality'] | ''

type Option = {
  value: Note['criticality']
  label: string
}

type Props = {
  modelValue: CriticalityValue
  options: readonly Option[]
  label: string
  idPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  idPrefix: 'criticality',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: CriticalityValue): void
}>()

const styles = useCssModule()

function select(value: Note['criticality']): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div :class="styles.criticalityPicker">
    <span :class="styles.criticalityLabel">{{ label }}</span>
    <div
      :class="styles.criticalityOptions"
      role="radiogroup"
      :aria-label="label"
    >
      <button
        v-for="option in props.options"
        :key="`${idPrefix}-${option.value}`"
        type="button"
        :class="[
          styles.criticalityOption,
          {
            [styles.criticalityOptionLow]: option.value === 'low',
            [styles.criticalityOptionMedium]: option.value === 'medium',
            [styles.criticalityOptionHigh]: option.value === 'high',
          },
          { [styles.criticalityOptionActive]: modelValue === option.value },
        ]"
        role="radio"
        :aria-checked="modelValue === option.value"
        @click="select(option.value)"
      >
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" module src="./CriticalityPicker.module.scss"></style>
