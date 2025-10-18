import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { KnowledgeBase } from '@/types'

interface KnowledgeState {
    // UI State
    selectedEntry: KnowledgeBase | null
    isFormModalOpen: boolean
    isDeleteConfirmOpen: boolean

    // Filters and Pagination
    filters: {
        search?: string
    }
    pagination: {
        page: number
        limit: number
        total: number
    }

    // Cache for optimistic updates
    optimisticUpdates: {
        creating: boolean
        updating: boolean
        deleting: string | null // ID of entry being deleted
    }

    // Actions
    setSelectedEntry: (entry: KnowledgeBase | null) => void
    openFormModal: (entry?: KnowledgeBase) => void
    closeFormModal: () => void
    openDeleteConfirm: (entry: KnowledgeBase) => void
    closeDeleteConfirm: () => void
    updateFilters: (filters: Partial<KnowledgeState['filters']>) => void
    updatePagination: (pagination: Partial<KnowledgeState['pagination']>) => void
    resetFilters: () => void

    // Optimistic update actions
    setCreating: (creating: boolean) => void
    setUpdating: (updating: boolean) => void
    setDeleting: (entryId: string | null) => void
}

export const useKnowledgeStore = create<KnowledgeState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                selectedEntry: null,
                isFormModalOpen: false,
                isDeleteConfirmOpen: false,
                filters: {
                    search: undefined,
                },
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                },
                optimisticUpdates: {
                    creating: false,
                    updating: false,
                    deleting: null,
                },

                // Actions
                setSelectedEntry: (entry) => {
                    set({ selectedEntry: entry }, false, 'setSelectedEntry')
                },

                openFormModal: (entry) => {
                    set(
                        {
                            selectedEntry: entry || null,
                            isFormModalOpen: true,
                        },
                        false,
                        'openFormModal'
                    )
                },

                closeFormModal: () => {
                    set(
                        {
                            selectedEntry: null,
                            isFormModalOpen: false,
                        },
                        false,
                        'closeFormModal'
                    )
                },

                openDeleteConfirm: (entry) => {
                    set(
                        {
                            selectedEntry: entry,
                            isDeleteConfirmOpen: true,
                        },
                        false,
                        'openDeleteConfirm'
                    )
                },

                closeDeleteConfirm: () => {
                    set(
                        {
                            selectedEntry: null,
                            isDeleteConfirmOpen: false,
                        },
                        false,
                        'closeDeleteConfirm'
                    )
                },

                updateFilters: (newFilters) => {
                    const state = get()
                    set(
                        {
                            filters: { ...state.filters, ...newFilters },
                            pagination: {
                                ...state.pagination,
                                page: 1, // Reset to first page when filters change
                            },
                        },
                        false,
                        'updateFilters'
                    )
                },

                updatePagination: (newPagination) => {
                    const state = get()
                    set(
                        {
                            pagination: { ...state.pagination, ...newPagination },
                        },
                        false,
                        'updatePagination'
                    )
                },

                resetFilters: () => {
                    set(
                        {
                            filters: {
                                search: undefined,
                            },
                            pagination: {
                                page: 1,
                                limit: 10,
                                total: 0,
                            },
                        },
                        false,
                        'resetFilters'
                    )
                },

                // Optimistic update actions
                setCreating: (creating) => {
                    const state = get()
                    set(
                        {
                            optimisticUpdates: {
                                ...state.optimisticUpdates,
                                creating,
                            },
                        },
                        false,
                        'setCreating'
                    )
                },

                setUpdating: (updating) => {
                    const state = get()
                    set(
                        {
                            optimisticUpdates: {
                                ...state.optimisticUpdates,
                                updating,
                            },
                        },
                        false,
                        'setUpdating'
                    )
                },

                setDeleting: (entryId) => {
                    const state = get()
                    set(
                        {
                            optimisticUpdates: {
                                ...state.optimisticUpdates,
                                deleting: entryId,
                            },
                        },
                        false,
                        'setDeleting'
                    )
                },
            }),
            {
                name: 'knowledge-store',
                partialize: (state) => ({
                    // Only persist user preferences
                    pagination: {
                        limit: state.pagination.limit, // Persist page size preference
                    },
                }),
            }
        ),
        {
            name: 'knowledge-store',
        }
    )
)

// Selectors for better performance
export const useKnowledgeSelectors = {
    selectedEntry: () => useKnowledgeStore((state) => state.selectedEntry),
    isFormModalOpen: () => useKnowledgeStore((state) => state.isFormModalOpen),
    isDeleteConfirmOpen: () => useKnowledgeStore((state) => state.isDeleteConfirmOpen),
    filters: () => useKnowledgeStore((state) => state.filters),
    pagination: () => useKnowledgeStore((state) => state.pagination),
    optimisticUpdates: () => useKnowledgeStore((state) => state.optimisticUpdates),

    // Computed selectors
    hasActiveFilters: () => useKnowledgeStore((state) => !!state.filters.search),

    isLoading: () => useKnowledgeStore((state) =>
        state.optimisticUpdates.creating ||
        state.optimisticUpdates.updating ||
        !!state.optimisticUpdates.deleting
    ),
}