<template>
  <div :class="$style.appLayout">
    <aside :class="[$style.sidebar, { [$style.sidebarCollapsed]: isCollapsed }]">
      <div :class="$style.sidebarHeader" @click="toggleSidebar">
        <h1 :class="$style.appTitle">FLOWMODE</h1>
      </div>

      <nav :class="$style.sidebarNav">
        <router-link to="/overview" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Обзор' : undefined">
          <span class="material-symbols-rounded">dashboard</span>
          <span>Обзор</span>
        </router-link>
        <router-link to="/list" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Список' : undefined">
          <span class="material-symbols-rounded">format_list_bulleted</span>
          <span>Список</span>
        </router-link>
        <router-link to="/calendar" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Календарь' : undefined">
          <span class="material-symbols-rounded">calendar_month</span>
          <span>Календарь</span>
        </router-link>
        <router-link to="/habits" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Привычки' : undefined">
          <span class="material-symbols-rounded">cycle</span>
          <span>Привычки</span>
        </router-link>
        <router-link to="/mood" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Настроение' : undefined">
          <span class="material-symbols-rounded">toys_fan</span>
          <span>Настроение</span>
        </router-link>
        <router-link to="/settings" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'Настройки' : undefined">
          <span class="material-symbols-rounded">settings</span>
          <span>Настройки</span>
        </router-link>
        <router-link to="/about" :class="$style.navItem" active-class="router-link-active" :title="isCollapsed ? 'О приложении' : undefined">
          <span class="material-symbols-rounded">info</span>
          <span>О приложении</span>
        </router-link>
      </nav>

      <!-- Индикатор обновлений -->
      <div :class="$style.updateSection">
        <div v-if="updateAvailable" :class="$style.updateAvailable">
          <span class="material-symbols-rounded">update</span>
          <span>Доступно обновление!</span>
          <button :class="$style.updateBtn" @click="installUpdate">Установить</button>
        </div>
        <div v-else-if="checkingUpdate" :class="$style.updateChecking">
          <span class="material-symbols-rounded">progress_activity</span>
          <span>Проверка...</span>
        </div>
        <button v-else :class="$style.checkUpdateBtn" @click="checkForUpdates" title="Проверить обновления">
          <span class="material-symbols-rounded">system_update</span>
        </button>
      </div>
    </aside>

    <main :class="$style.mainContent">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores'
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { sendNotification } from '@tauri-apps/plugin-notification'

const settingsStore = useSettingsStore()
const isCollapsed = ref(false)
const updateAvailable = ref(false)
const checkingUpdate = ref(false)

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// Проверка обновлений
async function checkForUpdates() {
  checkingUpdate.value = true
  try {
    const result = await invoke<boolean>('check_for_updates')
    if (result) {
      updateAvailable.value = true
      await sendNotification({
        title: 'FLOWMODE',
        body: 'Доступна новая версия приложения!',
      })
    }
  } catch (error) {
    console.error('Ошибка проверки обновлений:', error)
  } finally {
    checkingUpdate.value = false
  }
}

// Установка обновления
async function installUpdate() {
  try {
    await invoke('download_and_install_update')
    await sendNotification({
      title: 'FLOWMODE',
      body: 'Обновление установлено. Перезапустите приложение.',
    })
    updateAvailable.value = false
  } catch (error) {
    console.error('Ошибка установки обновления:', error)
    alert('Ошибка при установке обновления: ' + (error instanceof Error ? error.message : error))
  }
}

onMounted(() => {
  document.documentElement.setAttribute('data-theme', settingsStore.settings.theme)
  // Автоматическая проверка обновлений при запуске
  checkForUpdates()
})
</script>

<style lang="scss" module src="./MainLayout.module.scss"></style>
