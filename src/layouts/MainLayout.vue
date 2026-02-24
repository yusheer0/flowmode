<template>
  <div :class="$style.appLayout">
    <aside :class="$style.sidebar">
      <div :class="$style.sidebarHeader">
        <h1 :class="$style.appTitle">FLOWMODE</h1>
      </div>

      <nav :class="$style.sidebarNav">
        <router-link to="/diary" :class="$style.navItem">
          <span>Дневник</span>
        </router-link>
        <router-link to="/calendar" :class="$style.navItem">
          <span>Календарь</span>
        </router-link>
        <router-link to="/statistics" :class="$style.navItem">
          <span>Статистика</span>
        </router-link>
        <router-link to="/settings" :class="$style.navItem">
          <span>Настройки</span>
        </router-link>
      </nav>
    </aside>

    <main :class="$style.mainContent">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores'
import { onMounted } from 'vue'

const settingsStore = useSettingsStore()

onMounted(() => {
  document.documentElement.setAttribute('data-theme', settingsStore.settings.theme)
})
</script>

<style lang="scss" module src="./MainLayout.module.scss"></style>
