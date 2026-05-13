import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVaultStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('useVaultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  it('loads vault items and history', async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'vault_list') {
        return [{
          id: 'vault-1',
          title: 'GitHub',
          service: 'github.com',
          username: 'john',
          passwordMasked: '********',
          url: 'https://github.com',
          notes: '',
          tags: ['dev'],
          createdAt: '100',
          updatedAt: '100',
          sortOrder: 0,
        }]
      }
      if (command === 'vault_list_events') {
        return [{
          id: 'event-1',
          itemId: 'vault-1',
          type: 'created',
          createdAt: '100',
        }]
      }
      return []
    })

    const store = useVaultStore()
    await store.init()

    expect(store.items).toHaveLength(1)
    expect(store.events).toHaveLength(1)
    expect(store.items[0].passwordMasked).toBe('********')
  })

  it('reveals and hides password with cache', async () => {
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === 'vault_list') {
        return [{
          id: 'vault-1',
          title: 'GitHub',
          service: 'github.com',
          username: 'john',
          passwordMasked: '********',
          tags: [],
          createdAt: '100',
          updatedAt: '100',
          sortOrder: 0,
        }]
      }
      if (command === 'vault_list_events') return []
      if (command === 'vault_reveal') return 'VerySecret'
      return true
    })

    const store = useVaultStore()
    await store.refreshItems()

    await store.revealPassword('vault-1')
    expect(store.getVisiblePassword('vault-1')).toBe('VerySecret')

    store.hidePassword('vault-1')
    expect(store.getVisiblePassword('vault-1')).toBeNull()
  })
})
