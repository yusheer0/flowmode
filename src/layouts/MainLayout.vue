<template>
  <div :class="$style.appLayout">
    <aside :class="[$style.sidebar, { [$style.sidebarCollapsed]: isCollapsed }]">
      <div :class="$style.sidebarHeader" @click="toggleSidebar">
        <h1 :class="$style.appTitle">FLOWMODE</h1>
      </div>

      <nav :class="$style.sidebarNav">
        <router-link to="/calendar" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Календарь' : undefined">
          <span class="material-symbols-rounded">calendar_month</span>
          <span v-show="!isCollapsed">Календарь</span>
        </router-link>
        <router-link to="/diary" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Дневник' : undefined">
          <span class="material-symbols-rounded">book_2</span>
          <span v-show="!isCollapsed">Дневник</span>
        </router-link>
        <router-link to="/habits" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Привычки' : undefined">
          <span class="material-symbols-rounded">cycle</span>
          <span v-show="!isCollapsed">Привычки</span>
        </router-link>
        <router-link to="/mood" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Настроение' : undefined">
          <span class="material-symbols-rounded">toys_fan</span>
          <span v-show="!isCollapsed">Настроение</span>
        </router-link>
        <router-link to="/settings" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Настройки' : undefined">
          <span class="material-symbols-rounded">settings</span>
          <span v-show="!isCollapsed">Настройки</span>
        </router-link>
        <router-link to="/statistics" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Статистика' : undefined">
          <span class="material-symbols-rounded">pie_chart</span>
          <span v-show="!isCollapsed">Статистика</span>
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
import { ref, onMounted } from 'vue'

const settingsStore = useSettingsStore()
const isCollapsed = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  document.documentElement.setAttribute('data-theme', settingsStore.settings.theme)
})
</script>

<style lang="scss" module src="./MainLayout.module.scss"></style>
