<template>
  <div :class="$style.appLayout">
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
