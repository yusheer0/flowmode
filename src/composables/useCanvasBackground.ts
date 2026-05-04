import { computed } from 'vue'
import { useSettingsStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'

const MAX_CANVAS_BACKGROUND_SIZE_BYTES = 2 * 1024 * 1024

type TranslationKey = keyof typeof TRANSLATIONS.en
type TranslateFn = (key: TranslationKey) => string

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result)
    }
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

export function useCanvasBackground(t: TranslateFn) {
  const settingsStore = useSettingsStore()

  const hasCanvasBackground = computed(() => {
    return Boolean(settingsStore.settings.canvasBackgroundImage)
  })

  const canvasStyle = computed(() => {
    const image = settingsStore.settings.canvasBackgroundImage
    if (!image) return {}

    return {
      backgroundImage: `url("${image}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  })

  function clearCanvasBackground(): void {
    settingsStore.updateSettings({ canvasBackgroundImage: null })
  }

  async function applyCanvasBackgroundFromEvent(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const [file] = Array.from(target.files || [])

    if (!file) return

    if (file.size > MAX_CANVAS_BACKGROUND_SIZE_BYTES) {
      window.alert(t('canvasBackgroundTooLarge'))
      target.value = ''
      return
    }

    try {
      const imageDataUrl = await toDataUrl(file)
      settingsStore.updateSettings({ canvasBackgroundImage: imageDataUrl })
    } catch {
      window.alert(t('canvasBackgroundLoadError'))
    } finally {
      target.value = ''
    }
  }

  return {
    hasCanvasBackground,
    canvasStyle,
    clearCanvasBackground,
    applyCanvasBackgroundFromEvent,
  }
}
