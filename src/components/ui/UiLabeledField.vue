<script setup lang="ts">
type Props = {
  /** When true, shows `label` above the default slot. */
  showLabel?: boolean
  label?: string
}

withDefaults(defineProps<Props>(), {
  showLabel: false,
  label: '',
})
</script>

<template>
  <div :class="showLabel && label ? $style.root : $style.rootPlain">
    <span v-if="showLabel && label" :class="$style.caption">{{ label }}</span>
    <slot />
  </div>
</template>

<style lang="scss" module src="./UiLabeledField.module.scss"></style>
