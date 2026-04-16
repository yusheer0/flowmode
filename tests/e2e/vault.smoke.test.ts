import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVaultStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'
import type { VaultItem, VaultEvent } from '@/types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('vault smoke flow', () => {
  const db: { items: VaultItem[]; events: VaultEvent[] } = { items: [], events: [] }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    db.items = []
    db.events = []
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })

    vi.mocked(invoke).mockImplementation(async (command, payload) => {
      if (command === 'vault_list') return db.items
      if (command === 'vault_list_events') return db.events
      if (command === 'vault_create') {
        const input = payload?.input as Record<string, unknown>
        const item: VaultItem = {
          id: 'item-1',
          title: String(input.title),
          service: String(input.service),
          username: String(input.username),
          passwordMasked: '********',
          url: String(input.url || ''),
          notes: String(input.notes || ''),
          tags: Array.isArray(input.tags) ? input.tags.map(tag => String(tag)) : [],
          createdAt: '100',
          updatedAt: '100',
        }
        db.items = [item]
        db.events = [{ id: 'event-1', itemId: item.id, type: 'created', createdAt: '100' }]
        return item
      }
      if (command === 'vault_reveal') {
        db.events.unshift({ id: 'event-2', itemId: 'item-1', type: 'revealed', createdAt: '110' })
        return 'Sup3r-Secret!'
      }
      if (command === 'vault_log_copy') {
        db.events.unshift({ id: 'event-3', itemId: 'item-1', type: 'copied_password', createdAt: '120' })
        return true
      }
      if (command === 'vault_delete') {
        db.items = []
        db.events.unshift({ id: 'event-4', itemId: 'item-1', type: 'deleted', createdAt: '130' })
        return true
      }
      return true
    })
  })

  it('creates, reveals, copies and deletes vault item', async () => {
    const store = useVaultStore()

    const created = await store.createItem({
      title: 'GitHub',
      service: 'github.com',
      username: 'john',
      password: 'old',
      tags: ['dev'],
    })
    expect(created).toBe(true)
    expect(store.items).toHaveLength(1)

    const revealed = await store.revealPassword('item-1')
    expect(revealed).toBe('Sup3r-Secret!')

    const copied = await store.copyPassword('item-1')
    expect(copied).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Sup3r-Secret!')

    const deleted = await store.deleteItem('item-1')
    expect(deleted).toBe(true)
    expect(store.items).toHaveLength(0)
    expect(store.events[0].type).toBe('deleted')
  })
})
