import { computed, type Ref } from 'vue'
import type { VaultItem } from '@/types'
import { normalizeSearchValue } from '@/utils/vault'

export function useVaultListFilter(items: Ref<VaultItem[]>, searchQuery: Ref<string>) {
  const filteredItems = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    return items.value.filter((item) => {
      const title = normalizeSearchValue(item.title)
      const username = normalizeSearchValue(item.username)
      const service = normalizeSearchValue(item.service)
      const url = normalizeSearchValue(item.url)
      const notes = normalizeSearchValue(item.notes)

      return (
        !query
        || title.includes(query)
        || username.includes(query)
        || service.includes(query)
        || url.includes(query)
        || notes.includes(query)
      )
    })
  })

  const isSearchActive = computed(() => searchQuery.value.trim().length > 0)

  return { filteredItems, isSearchActive }
}
