import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
    // Global UI state
    sidebarCollapsed: boolean
    theme: 'light' | 'dark' | 'system'

    // User preferences
    preferences: {
        autoRefresh: boolean
        refreshInterval: number // in seconds
        notificationsEnabled: boolean
        soundEnabled: boolean
        compactMode: boolean
    }

    // System status
    systemStatus: {
        isOnline: boolean
        lastHealthCheck: Date | null
        pendingRequestsCount: number
        totalRequestsCount: number
    }

    // Actions
    toggleSidebar: () => void
    setSidebarCollapsed: (collapsed: boolean) => void
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    updatePreferences: (preferences: Partial<AppState['preferences']>) => void
    updateSystemStatus: (status: Partial<AppState['systemStatus']>) => void
    resetPreferences: () => void
}

const defaultPreferences: AppState['preferences'] = {
    autoRefresh: true,
    refreshInterval: 30,
    notificationsEnabled: true,
    soundEnabled: false,
    compactMode: false,
}

export const useAppStore = create<AppState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial state
                sidebarCollapsed: false,
                theme: 'system',
                preferences: defaultPreferences,
                systemStatus: {
                    isOnline: true,
                    lastHealthCheck: null,
                    pendingRequestsCount: 0,
                    totalRequestsCount: 0,
                },

                // Actions
                toggleSidebar: () => {
                    const state = get()
                    set(
                        { sidebarCollapsed: !state.sidebarCollapsed },
                        false,
                        'toggleSidebar'
                    )
                },

                setSidebarCollapsed: (collapsed) => {
                    set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed')
                },

                setTheme: (theme) => {
                    set({ theme }, false, 'setTheme')

                    // Apply theme to document
                    if (typeof window !== 'undefined') {
                        const root = window.document.documentElement
                        root.classList.remove('light', 'dark')

                        if (theme === 'system') {
                            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                            root.classList.add(systemTheme)
                        } else {
                            root.classList.add(theme)
                        }
                    }
                },

                updatePreferences: (newPreferences) => {
                    const state = get()
                    set(
                        {
                            preferences: { ...state.preferences, ...newPreferences },
                        },
                        false,
                        'updatePreferences'
                    )
                },

                updateSystemStatus: (newStatus) => {
                    const state = get()
                    set(
                        {
                            systemStatus: { ...state.systemStatus, ...newStatus },
                        },
                        false,
                        'updateSystemStatus'
                    )
                },

                resetPreferences: () => {
                    set(
                        { preferences: defaultPreferences },
                        false,
                        'resetPreferences'
                    )
                },
            }),
            {
                name: 'app-store',
                partialize: (state) => ({
                    // Persist user preferences and UI state
                    sidebarCollapsed: state.sidebarCollapsed,
                    theme: state.theme,
                    preferences: state.preferences,
                    // Don't persist system status as it should be fresh on load
                }),
            }
        ),
        {
            name: 'app-store',
        }
    )
)

// Selectors for better performance
export const useAppSelectors = {
    sidebarCollapsed: () => useAppStore((state) => state.sidebarCollapsed),
    theme: () => useAppStore((state) => state.theme),
    preferences: () => useAppStore((state) => state.preferences),
    systemStatus: () => useAppStore((state) => state.systemStatus),

    // Computed selectors
    isDarkMode: () => useAppStore((state) => {
        if (state.theme === 'dark') return true
        if (state.theme === 'light') return false
        // System theme
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        return false
    }),

    isSystemHealthy: () => useAppStore((state) =>
        state.systemStatus.isOnline &&
        state.systemStatus.lastHealthCheck &&
        Date.now() - state.systemStatus.lastHealthCheck.getTime() < 60000 // Within last minute
    ),
}