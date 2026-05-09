<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useVaultVirtualGrid } from '@/composables/useVaultVirtualGrid'
import { Cog, Grid2x2, Search, SquarePlus, Box } from 'lucide-vue-next'
import VaultItemCard from '@/components/vault/VaultItemCard.vue'
import VaultDialogs from '@/components/vault/VaultDialogs.vue'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useVaultListFilter } from '@/composables/useVaultListFilter'
import { useSettingsStore, useVaultStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import { useViewPageStyles } from '@/composables/useViewPageStyles'

const styles = useViewPageStyles()
const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const dialogsRef = ref<InstanceType<typeof VaultDialogs> | null>(null)

const searchQuery = ref('')

const { filteredItems } = useVaultListFilter(computed(() => vaultStore.items), searchQuery)
const {
  MIN_CARD_WIDTH,
  scrollHost,
  listPane,
  visibleItems,
  topSpacerHeight,
  bottomSpacerHeight,
  onListScroll,
} = useVaultVirtualGrid(filteredItems)

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

const { canvasStyle } = useCanvasBackground(t)

onMounted(async () => {
  await vaultStore.refreshItems()
})
</script>

<template>
  <section :class="styles.vaultView">
    <div ref="scrollHost" :class="styles.canvas" :style="canvasStyle" @scroll="onListScroll">
      <div :class="styles.virtualSpacer" :style="{ height: `${topSpacerHeight}px` }"></div>
      <div
        ref="listPane"
        :class="styles.listPane"
        :style="{ '--vault-card-min-width': `${MIN_CARD_WIDTH}px` }"
      >
        <VaultItemCard
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
          :styles="styles"
          :login-label="t('loginLabel')"
          :password-label="t('passwordLabel')"
          :delete-title="t('delete')"
          @edit="(item) => dialogsRef?.openEditModal(item)"
          @delete="(id) => dialogsRef?.promptDeleteItem(id)"
        />
        <p v-if="!filteredItems.length" :class="styles.emptyState">
          {{ t('emptyState') }}
        </p>
      </div>
      <div :class="styles.virtualSpacer" :style="{ height: `${bottomSpacerHeight}px` }"></div>
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
