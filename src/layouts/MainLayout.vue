<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">FLOWMODE</h1>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/diary" class="nav-item">
          <span>Дневник</span>
        </router-link>
        <router-link to="/calendar" class="nav-item">
          <span>Календарь</span>
        </router-link>
        <router-link to="/statistics" class="nav-item">
          <span>Статистика</span>
        </router-link>
        <router-link to="/settings" class="nav-item">
          <span>Настройки</span>
        </router-link>
      </nav>
    </aside>

    <main class="main-content">
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

<style lang="scss">
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  padding: 0 14px;
  border-bottom: 1px solid var(--color-border);
}

.app-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -2px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  color: var(--color-text);
  transition: background-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    background-color: var(--color-bg);
  }

  &.router-link-active {
    background-color: var(--color-primary);
    color: white;
  }
}

.nav-icon {
  font-size: 1.25rem;
}

.main-content {
  flex: 1;
  overflow: auto;
  background-color: var(--color-bg);
}
</style>
