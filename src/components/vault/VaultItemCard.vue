<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'
import type { VaultItem } from '@/types'

type Props = {
  item: VaultItem
  loginLabel: string
  passwordLabel: string
  deleteTitle: string
  styles: Record<string, string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'delete', itemId: string): void
}>()
</script>

<template>
  <article
    :class="styles.card"
    @click="emit('edit', item)"
  >
    <h3 :class="styles.cardTitle">{{ item.title }}</h3>
    <p :class="styles.cardText"><strong>{{ loginLabel }} :</strong> {{ item.username }}</p>
    <p :class="styles.cardText"><strong>{{ passwordLabel }} :</strong> {{ item.passwordMasked }}</p>
    <p v-if="item.url" :class="styles.cardText"><strong>URL :</strong> {{ item.url }}</p>
    <div :class="styles.actions">
      <button
        :class="styles.cardAction"
        type="button"
        :title="deleteTitle"
        @click.stop="emit('delete', item.id)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </article>
</template>
