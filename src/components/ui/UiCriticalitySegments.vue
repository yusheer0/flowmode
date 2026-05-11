<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'

type Tone = 'low' | 'medium' | 'high'

type Segment<T extends string = string> = {
  value: T
  label: string
  tone: Tone
}

type Props = {
  modelValue: string | ''
  segments: readonly Segment<string>[]
  /** Prefix for stable `key` attributes (e.g. create vs edit). */
  idPrefix?: string
  /** Accessible name for the radiogroup. */
  ariaLabel: string
}

withDefaults(defineProps<Props>(), {
  idPrefix: 'criticality',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function select(value: string): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div
    :class="$style.options"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <UiButton
      v-for="seg in segments"
      :key="`${idPrefix}-${seg.value}`"
      variant="plain"
      type="button"
      :class="[$style.option, modelValue === seg.value && $style.optionActive]"
      :data-tone="seg.tone"
      role="radio"
      :aria-checked="modelValue === seg.value"
      @click="select(seg.value)"
    >
      <span>{{ seg.label }}</span>
    </UiButton>
  </div>
</template>

<style module lang="scss">
.options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 2px solid var(--vs-criticality-option-border);
  border-radius: 12px;
  padding: 0 10px;
  font-size: 16px;
  letter-spacing: -0.5px;
  color: var(--vs-criticality-option-fg);
  background: transparent;
  outline: none;
  transition: border-color 0.18s ease, color 0.18s ease;

  &:focus {
    border-color: var(--vs-criticality-option-focus-border);
  }
}

.optionActive {
  background: transparent;
}

.optionActive[data-tone='low'] {
  border-color: var(--vs-criticality-low-active-border);
  color: var(--vs-criticality-low-active-fg);
}

.optionActive[data-tone='medium'] {
  border-color: var(--vs-criticality-medium-active-border);
  color: var(--vs-criticality-medium-active-fg);
}

.optionActive[data-tone='high'] {
  border-color: var(--vs-criticality-high-active-border);
  color: var(--vs-criticality-high-active-fg);
}
</style>
