import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type ActiveAppView = 'notes' | 'vault' | 'habits'

export function useViewNavigation() {
  const router = useRouter()
  const route = useRoute()
  const isViewPickerModalOpen = ref(false)

  const activeView = computed<ActiveAppView>(() => {
    if (route.name === 'vault') return 'vault'
    if (route.name === 'habits') return 'habits'
    return 'notes'
  })

  function openViewPickerModal(): void {
    isViewPickerModalOpen.value = true
  }

  function closeViewPickerModal(): void {
    isViewPickerModalOpen.value = false
  }

  function openView(view: ActiveAppView): void {
    closeViewPickerModal()
    if (view === activeView.value) return
    if (view === 'vault') {
      void router.push('/vault')
      return
    }
    if (view === 'habits') {
      void router.push('/habits')
      return
    }
    void router.push('/notes')
  }

  return {
    activeView,
    openView,
    isViewPickerModalOpen,
    openViewPickerModal,
    closeViewPickerModal,
  }
}
