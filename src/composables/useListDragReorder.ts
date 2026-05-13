import { ref, type Ref } from 'vue'

/** 1×1 transparent GIF — скрывает полупрозрачный «призрак» браузера при drag. */
let emptyDragImage: HTMLImageElement | null = null

function getEmptyDragImage(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  if (!emptyDragImage) {
    emptyDragImage = new Image()
    emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  }
  return emptyDragImage
}

function applyEmptyDragImage(event: DragEvent): void {
  const dt = event.dataTransfer
  const img = getEmptyDragImage()
  if (!dt || !img) return
  try {
    dt.setDragImage(img, 0, 0)
  } catch {
    // Safari / старые движки могут не дать заменить картинку
  }
}

export function useListDragReorder(options: {
  enabled: Ref<boolean>
  canDrop: (draggedId: string, targetId: string) => boolean
  onReorder: (draggedId: string, targetId: string, placeBefore: boolean) => void
}) {
  const draggingId = ref<string | null>(null)
  const dragOverId = ref<string | null>(null)
  const isDragOverBefore = ref(true)

  function setDndActive(active: boolean): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('fm-dnd-active', active)
  }

  function clearDragState(): void {
    draggingId.value = null
    dragOverId.value = null
    setDndActive(false)
  }

  function onHandleDragStart(event: DragEvent, itemId: string): void {
    if (!options.enabled.value) {
      event.preventDefault()
      return
    }
    draggingId.value = itemId
    event.dataTransfer?.setData('text/plain', itemId)
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
    applyEmptyDragImage(event)
    setDndActive(true)
  }

  function onCardDragOver(event: DragEvent, itemId: string): void {
    if (!options.enabled.value || !draggingId.value) return
    const dragged = draggingId.value
    if (dragged === itemId) return
    if (!options.canDrop(dragged, itemId)) return

    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    dragOverId.value = itemId
    const el = event.currentTarget as HTMLElement
    const r = el.getBoundingClientRect()
    const h = Math.max(r.height, 1)
    const ratio = (event.clientY - r.top) / h
    if (ratio < 0.36) {
      isDragOverBefore.value = true
    }
    else if (ratio > 0.64) {
      isDragOverBefore.value = false
    }
  }

  function onCardDragLeave(event: DragEvent, itemId: string): void {
    const el = event.currentTarget as HTMLElement
    const related = event.relatedTarget as Node | null
    if (related && el.contains(related)) return
    if (dragOverId.value === itemId) {
      dragOverId.value = null
    }
  }

  function onCardDrop(event: DragEvent, itemId: string): void {
    event.preventDefault()
    const dragged = draggingId.value ?? event.dataTransfer?.getData('text/plain')
    if (!dragged || dragged === itemId) {
      clearDragState()
      return
    }
    if (!options.canDrop(dragged, itemId)) {
      clearDragState()
      return
    }
    options.onReorder(dragged, itemId, isDragOverBefore.value)
    clearDragState()
  }

  function onDragEnd(): void {
    clearDragState()
  }

  return {
    draggingId,
    dragOverId,
    isDragOverBefore,
    onHandleDragStart,
    onCardDragOver,
    onCardDragLeave,
    onCardDrop,
    onDragEnd,
  }
}
