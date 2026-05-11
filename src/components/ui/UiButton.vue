<script setup lang="ts">
/** `plain`: reset only — pair with module classes (modals, chips, icon controls). */
type Variant = 'cta' | 'save' | 'delete' | 'about' | 'plain'

type Props = {
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  variant?: Variant
  /** When set, renders as `<a>` (e.g. external links in About). */
  href?: string
  target?: string
  rel?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  type: 'button',
  variant: 'cta',
  target: '_blank',
  rel: 'noopener noreferrer',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

function onClick(event: MouseEvent) {
  if (props.href && props.disabled) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :class="variant === 'plain' ? $style.plain : [$style.base, $style[variant]]"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled"
    :href="href"
    :target="href ? target : undefined"
    :rel="href ? rel : undefined"
    :aria-disabled="href && disabled ? true : undefined"
    @click="onClick"
  >
    <slot />
  </component>
</template>

<style module lang="scss">
.base {
  height: 48px;
  border-radius: 10px;
  font-size: 16px;
  letter-spacing: -0.5px;
  padding: 0 20px;
  transition: background-color 0.5s ease, color 0.5s ease;

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.cta {
  color: var(--vs-cta-text);
  background: var(--vs-cta-bg);

  &:hover:not(:disabled) {
    background: var(--vs-cta-hover-bg);
    color: var(--vs-cta-text);
  }
}

.save {
  color: var(--vs-save-text);
  background: var(--vs-save-bg);

  &:hover:not(:disabled) {
    background: var(--vs-save-hover-bg);
  }
}

.delete {
  color: var(--vs-delete-border);
  background: transparent;
  border: 1px solid var(--vs-delete-border);

  &:hover:not(:disabled) {
    background: var(--vs-delete-bg);
    color: var(--vs-delete-text);
  }
}

.plain {
  margin: 0;
  padding: 0;
  border: #000;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;

  &:disabled {
    cursor: default;
  }
}

.about {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: start;
  height: auto;
  min-height: 48px;
  min-width: 140px;
  width: fit-content;
  padding: 0 16px;
  border: 1px solid var(--vs-about-link-border);
  border-radius: 9px;
  background: var(--vs-about-link-bg);
  color: var(--vs-about-link-text);
  font-weight: 500;
  letter-spacing: normal;
  text-decoration: none;
  transition: background 0.5s ease;

  &:hover:not(:disabled) {
    background: var(--vs-about-link-hover);
  }

  &[aria-disabled='true'] {
    opacity: 0.45;
    pointer-events: none;
  }
}
</style>
