import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
} from 'vue'
import type { VaultItem } from '@/types'

export const VAULT_VIRTUAL_MIN_CARD_WIDTH = 300
export const VAULT_VIRTUAL_ESTIMATED_CARD_HEIGHT = 186
export const VAULT_VIRTUAL_CARD_GAP = 12
export const VAULT_VIRTUAL_OVERSCAN_ROWS = 3

/**
 * Masonry-like virtual slice for Vault list: observes scrollHost + listPane, tracks column count.
 */
export function useVaultVirtualGrid(filteredItems: ComputedRef<VaultItem[]>) {
  const scrollHost = ref<HTMLElement | null>(null)
  const listPane = ref<HTMLElement | null>(null)
  const scrollTopVal = ref(0)
  const viewportHeight = ref(0)
  const columnCount = ref(1)
  let resizeObserver: ResizeObserver | null = null

  const MIN_CARD_WIDTH = VAULT_VIRTUAL_MIN_CARD_WIDTH
  const ESTIMATED_CARD_HEIGHT = VAULT_VIRTUAL_ESTIMATED_CARD_HEIGHT
  const CARD_GAP = VAULT_VIRTUAL_CARD_GAP
  const OVERSCAN_ROWS = VAULT_VIRTUAL_OVERSCAN_ROWS

  const rowStride = computed(() => ESTIMATED_CARD_HEIGHT + CARD_GAP)
  const totalRows = computed(() => Math.ceil(filteredItems.value.length / columnCount.value))
  const startRow = computed(() => {
    const firstVisibleRow = Math.max(
      0,
      Math.floor(scrollTopVal.value / rowStride.value) - OVERSCAN_ROWS,
    )
    const maxStartRow = Math.max(0, totalRows.value - 1)
    return Math.min(firstVisibleRow, maxStartRow)
  })
  const visibleRowCount = computed(() => {
    const base = Math.ceil(viewportHeight.value / rowStride.value)
    return Math.max(1, base + OVERSCAN_ROWS * 2)
  })
  const endRow = computed(() => Math.min(totalRows.value, startRow.value + visibleRowCount.value))
  const startIndex = computed(() => startRow.value * columnCount.value)
  const endIndex = computed(() => Math.min(filteredItems.value.length, endRow.value * columnCount.value))
  const visibleItems = computed(() => filteredItems.value.slice(startIndex.value, endIndex.value))
  const topSpacerHeight = computed(() => startRow.value * rowStride.value)
  const bottomSpacerHeight = computed(
    () => Math.max(0, (totalRows.value - endRow.value) * rowStride.value),
  )

  function syncViewportMetrics(): void {
    if (!scrollHost.value) return
    viewportHeight.value = scrollHost.value.clientHeight
  }

  function syncColumnCount(): void {
    if (!listPane.value) return
    const containerWidth = listPane.value.clientWidth
    if (containerWidth <= 0) {
      columnCount.value = 1
      return
    }
    columnCount.value = Math.max(
      1,
      Math.floor((containerWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)),
    )
  }

  function syncViewportState(): void {
    syncViewportMetrics()
    syncColumnCount()
  }

  function onListScroll(event: Event): void {
    const target = event.target as HTMLElement
    scrollTopVal.value = target.scrollTop
  }

  onMounted(() => {
    syncViewportState()

    resizeObserver = new ResizeObserver(() => {
      syncViewportState()
    })

    if (scrollHost.value) {
      resizeObserver.observe(scrollHost.value)
    }
    if (listPane.value) {
      resizeObserver.observe(listPane.value)
    }
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    MIN_CARD_WIDTH,
    scrollHost,
    listPane,
    visibleItems,
    topSpacerHeight,
    bottomSpacerHeight,
    onListScroll,
  }
}
