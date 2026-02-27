<template>
  <div :class="$style.appLayout">
    <header :class="$style.header">
      <div :class="$style.headerTop">
        <span :class="$style.logo">FLOWMODE</span>

        <router-link
          to="/settings"
          :class="[$style.iconBtn, $style.settingsBtn]"
          :active-class="$style.iconBtnActive"
          title="Настройки"
        >
          <span class="material-symbols-rounded">settings</span>
        </router-link>
      </div>

      <nav :class="$style.headerBottom">
        <router-link
          to="/home"
          :class="$style.navItem"
          exact-active-class=""
          :active-class="$style.navItemActive"
        >
          <span>Главная</span>
        </router-link>
        <router-link
          to="/notes"
          :class="$style.navItem"
          :active-class="$style.navItemActive"
        >
          <span>Заметки</span>
        </router-link>
      </nav>
    </header>

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
