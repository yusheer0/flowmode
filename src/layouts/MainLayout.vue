<template>
  <div :class="$style.appLayout">
    <main :class="$style.mainContent">
      <router-view />
    </main>
    <nav v-if="showViewDock" :class="$style.viewDock">
      <button
        :class="[$style.viewButton, { [$style.viewButtonActive]: activeView === 'notes' }]"
        type="button"
        @click="openView('notes')"
      >
        {{ t('notesViewTitle') }}
      </button>
      <button
        :class="[$style.viewButton, { [$style.viewButtonActive]: activeView === 'vault' }]"
        type="button"
        @click="openView('vault')"
      >
        {{ t('vaultViewTitle') }}
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()
const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const showViewDock = computed(() => route.name === 'notes' || route.name === 'vault')
const activeView = computed<'notes' | 'vault'>(() => (route.name === 'vault' ? 'vault' : 'notes'))

function openView(view: 'notes' | 'vault'): void {
  void router.push(view === 'vault' ? '/vault' : '/notes')
}

onMounted(() => {
  document.documentElement.setAttribute('data-theme', settingsStore.settings.theme)
})
</script>

<style lang="scss" module src="./MainLayout.module.scss"></style>
