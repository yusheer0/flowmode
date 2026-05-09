import { computed, ref } from 'vue'
import { useNotesStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'

type NotesStore = ReturnType<typeof useNotesStore>

export function useNotesLayers(
  notesStore: NotesStore,
  t: (key: keyof typeof TRANSLATIONS.en) => string,
  openLayerSheet: () => void,
  closeLayerSheet: () => void,
) {
  const newLayerName = ref('')
  const layerFormError = ref('')
  const isLayerDeleteConfirmModalOpen = ref(false)
  const pendingDeleteLayerId = ref<string | null>(null)

  const customLayersCount = computed(() => notesStore.layers.filter(layer => !layer.isDefault).length)
  const canCreateCustomLayer = computed(() => notesStore.canCreateCustomLayer())
  const canSubmitLayer = computed(() => canCreateCustomLayer.value && newLayerName.value.length > 0)
  const hasNoLayers = computed(() => notesStore.layers.length === 0)

  function mapLayerError(code?: string, error?: string): string {
    if (code === 'LAYER_NAME_REQUIRED') return t('layerNameRequired')
    if (code === 'LAYER_NAME_EXISTS') return t('layerNameExists')
    if (code === 'LAYER_LIMIT_REACHED') return t('layerLimitReached')
    if (!error) return t('customLayerCreateFailed')
    if (error.includes('Введите название слоя')) return t('layerNameRequired')
    if (error.includes('уже существует')) return t('layerNameExists')
    if (error.includes('Достигнут лимит')) return t('layerLimitReached')
    return t('customLayerCreateFailed')
  }

  function mapLayerDeleteError(code?: string, error?: string): string {
    if (code === 'LAYER_DELETE_LAST_BLOCKED') return t('layerDeleteLastBlocked')
    if (code === 'LAYER_NOT_FOUND') return t('layerDeleteNotFound')
    if (code === 'LAYER_TARGET_NOT_FOUND') return t('layerDeleteNotFound')
    if (!error) return t('layerDeleteFailed')
    if (error.includes('последний слой')) return t('layerDeleteLastBlocked')
    if (error.includes('не найден')) return t('layerDeleteNotFound')
    return t('layerDeleteFailed')
  }

  function openLayerModal(): void {
    newLayerName.value = ''
    layerFormError.value = ''
    openLayerSheet()
  }

  function closeLayerModal(): void {
    if (hasNoLayers.value) return
    layerFormError.value = ''
    closeDeleteLayerConfirm()
    closeLayerSheet()
  }

  function selectLayer(layerId: string): void {
    notesStore.setActiveLayer(layerId)
    closeLayerSheet()
  }

  function createLayer(): void {
    if (!canSubmitLayer.value) return
    const result = notesStore.createCustomLayer(newLayerName.value)
    if (!result.success) {
      layerFormError.value = mapLayerError(result.code, result.error)
      return
    }

    newLayerName.value = ''
    layerFormError.value = ''
  }

  function deleteLayer(layerId: string): void {
    pendingDeleteLayerId.value = layerId
    isLayerDeleteConfirmModalOpen.value = true
  }

  function closeDeleteLayerConfirm(): void {
    isLayerDeleteConfirmModalOpen.value = false
    pendingDeleteLayerId.value = null
  }

  function confirmDeleteLayer(): void {
    if (!pendingDeleteLayerId.value) return

    const layerId = pendingDeleteLayerId.value
    closeDeleteLayerConfirm()

    const result = notesStore.deleteLayer(layerId)
    if (!result.success) {
      layerFormError.value = mapLayerDeleteError(result.code, result.error)
      return
    }
    layerFormError.value = ''
  }

  return {
    newLayerName,
    layerFormError,
    isLayerDeleteConfirmModalOpen,
    customLayersCount,
    canCreateCustomLayer,
    canSubmitLayer,
    hasNoLayers,
    openLayerModal,
    closeLayerModal,
    selectLayer,
    createLayer,
    deleteLayer,
    confirmDeleteLayer,
    closeDeleteLayerConfirm,
  }
}
