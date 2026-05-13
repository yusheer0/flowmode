<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Cog, Grid2x2, Search, SquarePlus, Box } from 'lucide-vue-next'
import VaultItemCard from '@/components/vault/VaultItemCard.vue'
import VaultDialogs from '@/components/vault/VaultDialogs.vue'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useVaultListFilter } from '@/composables/useVaultListFilter'
import { useListDragReorder } from '@/composables/useListDragReorder'
import { VAULT_VIRTUAL_MIN_CARD_WIDTH } from '@/composables/useVaultVirtualGrid'
import { useSettingsStore, useVaultStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import { useViewPageStyles } from '@/composables/useViewPageStyles'

const styles = useViewPageStyles()
const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const dialogsRef = ref<InstanceType<typeof VaultDialogs> | null>(null)

const searchQuery = ref('')

const { filteredItems, isSearchActive } = useVaultListFilter(computed(() => vaultStore.items), searchQuery)

const reorderEnabled = computed(() => !isSearchActive.value)

const listDrag = useListDragReorder({
  enabled: reorderEnabled,
  canDrop: () => true,
  onReorder: (draggedId, targetId, placeBefore) => {
    const order = filteredItems.value.map(i => i.id)
    const next = order.filter(id => id !== draggedId)
    const targetIndexInNext = next.indexOf(targetId)
    if (targetIndexInNext === -1) return
    const insertAt = placeBefore ? targetIndexInNext : targetIndexInNext + 1
    next.splice(insertAt, 0, draggedId)
    void vaultStore.reorderItems(next)
  },
})

const {
  draggingId,
  dragOverId,
  isDragOverBefore,
  onHandleDragStart,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onDragEnd,
} = listDrag

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

const { canvasStyle } = useCanvasBackground(t)

onMounted(async () => {
  await vaultStore.refreshItems()
})
</script>

<template>
  <section :class="styles.vaultView">
    <div :class="styles.canvas" :style="canvasStyle">
      <div
        :class="styles.listPane"
        :style="{ '--vault-card-min-width': `${VAULT_VIRTUAL_MIN_CARD_WIDTH}px` }"
      >
        <VaultItemCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          :styles="styles"
          :login-label="t('loginLabel')"
          :password-label="t('passwordLabel')"
          :delete-title="t('delete')"
          :reorder-enabled="reorderEnabled"
          :drag-handle-title="t('dragToReorderTitle')"
          :is-dragging="draggingId === item.id"
          :is-drop-target="dragOverId === item.id"
          :drop-before="isDragOverBefore"
          @edit="(entry) => dialogsRef?.openEditModal(entry)"
          @delete="(id) => dialogsRef?.promptDeleteItem(id)"
          @drag-handle-start="(e) => onHandleDragStart(e, item.id)"
          @card-drag-over="(e) => onCardDragOver(e, item.id)"
          @card-drag-leave="(e) => onCardDragLeave(e, item.id)"
          @card-drop="(e) => onCardDrop(e, item.id)"
          @card-drag-end="onDragEnd"
        />
        <p v-if="!filteredItems.length" :class="styles.emptyState">
          {{ t('emptyState') }}
        </p>
      </div>
    </div>

    <VaultDialogs ref="dialogsRef" v-model:search-query="searchQuery" />

    <nav :class="styles.bottomDock">
      <button
        :class="styles.dockButton"
        type="button"
        :title="t('createEntry')"
        @click="dialogsRef?.openCreateModal()"
      >
        <SquarePlus :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isSearchModalOpen },
        ]"
        type="button"
        :title="t('searchTitle')"
        @click="dialogsRef?.toggleSearchModal()"
      >
        <Search :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isViewPickerModalOpen },
        ]"
        type="button"
        title="View"
        @click="dialogsRef?.openViewPickerModal()"
      >
        <Grid2x2 :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isSettingsModalOpen },
        ]"
        type="button"
        :title="t('settingsTitle')"
        @click="dialogsRef?.openSettingsModal()"
      >
        <Cog :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isAboutModalOpen },
        ]"
        type="button"
        :title="t('aboutTitle')"
        @click="dialogsRef?.openAboutModal()"
      >
        <Box :size="24" />
      </button>
    </nav>
  </section>
</template>

<style lang="scss" module src="./VaultWorkspace.module.scss"></style>
