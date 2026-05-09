import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { Note } from '@/types'

export function useNotesSearchFilter(searchQuery: Ref<string>, sortedNotes: ComputedRef<Note[]>) {
  const debouncedSearchQuery = ref('')
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(searchQuery, (nextValue) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
      debouncedSearchQuery.value = nextValue.trim().toLowerCase()
    }, 180)
  }, { immediate: true })

  const searchableNotes = computed(() => sortedNotes.value.map(note => ({
    note,
    normalizedContent: note.content.toLowerCase(),
    normalizedTitle: note.title.toLowerCase(),
  })))

  const filteredNotes = computed(() => {
    const query = debouncedSearchQuery.value
    if (!query) return searchableNotes.value.map(entry => entry.note)
    return searchableNotes.value
      .filter(({ normalizedContent, normalizedTitle }) =>
        normalizedContent.includes(query) || normalizedTitle.includes(query))
      .map(entry => entry.note)
  })

  onBeforeUnmount(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  })

  return { filteredNotes }
}
