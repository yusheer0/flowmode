import { ref } from 'vue'

export function useNotesSheets() {
  const isSearchModalOpen = ref(false)
  const isSettingsModalOpen = ref(false)
  const isAboutModalOpen = ref(false)
  const isLayerModalOpen = ref(false)

  function closeSecondarySheets(): void {
    isSearchModalOpen.value = false
    isSettingsModalOpen.value = false
    isAboutModalOpen.value = false
    isLayerModalOpen.value = false
  }

  function openSearchModal(): void {
    closeSecondarySheets()
    isSearchModalOpen.value = true
  }

  function closeSearchModal(): void {
    isSearchModalOpen.value = false
  }

  function openSettingsModal(): void {
    closeSecondarySheets()
    isSettingsModalOpen.value = true
  }

  function closeSettingsModal(): void {
    isSettingsModalOpen.value = false
  }

  function openAboutModal(): void {
    closeSecondarySheets()
    isAboutModalOpen.value = true
  }

  function closeAboutModal(): void {
    isAboutModalOpen.value = false
  }

  function openLayerModal(): void {
    closeSecondarySheets()
    isLayerModalOpen.value = true
  }

  function closeLayerModal(): void {
    isLayerModalOpen.value = false
  }

  return {
    isSearchModalOpen,
    isSettingsModalOpen,
    isAboutModalOpen,
    isLayerModalOpen,
    closeSecondarySheets,
    openSearchModal,
    closeSearchModal,
    openSettingsModal,
    closeSettingsModal,
    openAboutModal,
    closeAboutModal,
    openLayerModal,
    closeLayerModal,
  }
}
