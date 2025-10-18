import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { HelpRequest, RequestStatus } from '@/types'

interface DashboardState {
    // UI State
    selectedRequest: HelpRequest | null
    isResolveModalOpen: boolean
    currentTab: 'pending' | 'resolved' | 'unresolved'

    // Filters and Pagination
    filters: {
        status?: RequestStatus
        search?: string
    }
    pagination: {
        page: number
        limit: number
        total: number
    }

    // Actions
    setSelectedRequest: (request: HelpRequest | null) => void
    openResolveModal: (request: HelpRequest) => void
    closeResolveModal: () => void
    setCurrentTab: (tab: 'pending' | 'resolved' | 'unresolved') => void
    updateFilters: (filters: Partial<DashboardState['filters']>) => void
    updatePagination: (pagination: Partial<DashboardState['pagination']>) => void
    resetFilters: () => void
}

export const useDashboardStore = create<DashboardState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                selectedRequest: null,
                isResolveModalOpen: false,
                currentTab: 'pending',
                filters: {
                    status: undefined,
                    search: undefined,
                },
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                },

                // Actions
                setSelectedRequest: (request) => {
                    set({ selectedRequest: request }, false, 'setSelectedRequest')
                },

                openResolveModal: (request) => {
                    set(
                        {
                            selectedRequest: request,
                            isResolveModalOpen: true,
                        },
                        false,
                        'openResolveModal'
                    )
                },

                closeResolveModal: () => {
                    set(
                        {
                            selectedRequest: null,
                            isResolveModalOpen: false,
                        },
                        false,
                        'closeResolveModal'
                    )
                },

                setCurrentTab: (tab) => {
                    const state = get()
                    set(
                        {
                            currentTab: tab,
                            filters: {
                                ...state.filters,
                                status: tab === 'pending' ? RequestStatus.PENDING :
                                    tab === 'resolved' ? RequestStatus.RESOLVED :
                                        tab === 'unresolved' ? RequestStatus.UNRESOLVED :
                                            undefined,
                            },
                            pagination: {
                                ...state.pagination,
                                page: 1, // Reset to first page when changing tabs
                            },
                        },
                        false,
                        'setCurrentTab'
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
                                status: undefined,
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
            }),
            {
                name: 'dashboard-store',
                partialize: (state) => ({
                    // Only persist user preferences, not temporary UI state
                    currentTab: state.currentTab,
                    pagination: {
                        limit: state.pagination.limit, // Persist page size preference
                    },
                }),
            }
        ),
        {
            name: 'dashboard-store',
        }
    )
)

// Selectors for better performance
export const useDashboardSelectors = {
    selectedRequest: () => useDashboardStore((state) => state.selectedRequest),
    isResolveModalOpen: () => useDashboardStore((state) => state.isResolveModalOpen),
    currentTab: () => useDashboardStore((state) => state.currentTab),
    filters: () => useDashboardStore((state) => state.filters),
    pagination: () => useDashboardStore((state) => state.pagination),

    // Computed selectors
    hasActiveFilters: () => useDashboardStore((state) =>
        !!(state.filters.search || (state.filters.status && state.currentTab === 'pending'))
    ),

    currentFilters: () => useDashboardStore((state) => ({
        ...state.filters,
        status: state.currentTab === 'pending' ? RequestStatus.PENDING :
            state.currentTab === 'resolved' ? RequestStatus.RESOLVED :
                state.currentTab === 'unresolved' ? RequestStatus.UNRESOLVED :
                    state.filters.status,
    })),
}