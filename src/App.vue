<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettingsStore, useMasterPasswordStore, useNotesStore, useWeatherStore } from '@/stores'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const masterPasswordStore = useMasterPasswordStore()
const notesStore = useNotesStore()
const weatherStore = useWeatherStore()

const isChecking = ref(true)

const themeConfig = computed(() => {
  const isDark = settingsStore.settings.theme === 'dark'

  return {
    token: {
      colorPrimary: isDark ? '#58a6ff' : '#0969da',
      colorBgContainer: isDark ? '#161b22' : '#ffffff',
      colorBgElevated: isDark ? '#1c2128' : '#ffffff',
      colorBgLayout: isDark ? '#0d1117' : '#f6f8fa',
      colorBorder: isDark ? '#30363d' : '#d0d7de',
      colorBorderSecondary: isDark ? '#21262d' : '#d8dee4',
      colorText: isDark ? '#e6edf3' : '#1f2328',
      colorTextSecondary: isDark ? '#7d8590' : '#656d76',
      colorTextTertiary: isDark ? '#484f58' : '#8c959f',
      colorFill: isDark ? '#21262d' : '#eaeef2',
      colorFillSecondary: isDark ? '#161b22' : '#f6f8fa',
      colorError: isDark ? '#f85149' : '#cf222e',
      colorWarning: isDark ? '#d29922' : '#9a6700',
      colorSuccess: isDark ? '#3fb950' : '#1a7f37',
      borderRadius: 6,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
      fontSize: 14,
    },
    components: {
      Button: { borderRadius: 6 },
      Input: { borderRadius: 6, borderRadiusLG: 6, borderRadiusSM: 4 },
      Card: { borderRadius: 6 },
      Modal: { borderRadiusLG: 6 },
      Menu: { borderRadius: 6 },
      Select: { borderRadius: 6 },
    },
  }
})

// Проверка необходимости блокировки
function checkLock(): void {
  const isPasswordSet = masterPasswordStore.isPasswordSet()
  const currentPath = route.path

  // Если мы на странице мастер-пароля, не блокируем
  if (currentPath === '/master-password') {
    isChecking.value = false
    return
  }

  // Если пароль не установлен или не разблокировано - redirect на мастер-пароль
  // Кроме home страницы - она доступна без разблокировки
  if (!isPasswordSet || !masterPasswordStore.isUnlocked) {
    if (currentPath !== '/home' && currentPath !== '/') {
      router.replace('/master-password')
    }
    isChecking.value = false
  } else {
    isChecking.value = false
  }
}

onMounted(() => {
  masterPasswordStore.init()
  notesStore.init()
  weatherStore.init()
  checkLock()
})

// Следим за состоянием разблокировки
watch(() => masterPasswordStore.isUnlocked, () => {
  checkLock()
})
</script>
