// Export all stores and their selectors
export { useDashboardStore, useDashboardSelectors } from './dashboard-store'
export { useKnowledgeStore, useKnowledgeSelectors } from './knowledge-store'
export { useAppStore, useAppSelectors } from './app-store'

// Import stores for utilities
import { useDashboardStore } from './dashboard-store'
import { useKnowledgeStore } from './knowledge-store'
import { useAppStore } from './app-store'

// Store utilities
export const resetAllStores = () => {
    // Reset all stores to their initial state
    useDashboardStore.getState().resetFilters()
    useKnowledgeStore.getState().resetFilters()
    useAppStore.getState().resetPreferences()
}

// Debug utilities (only in development)
if (process.env.NODE_ENV === 'development') {
    // Make stores available globally for debugging
    if (typeof window !== 'undefined') {
        ; (window as any).__stores = {
            dashboard: useDashboardStore,
            knowledge: useKnowledgeStore,
            app: useAppStore,
        }
    }
}