import { useEffect, useRef } from 'react'
import { useAppSelectors } from '@/lib/stores'

/**
 * Hook for auto-refreshing queries based on user preferences
 */
export function useAutoRefresh(
    refreshFn: () => void,
    dependencies: any[] = []
) {
    const preferences = useAppSelectors.preferences()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (preferences.autoRefresh) {
            intervalRef.current = setInterval(
                refreshFn,
                preferences.refreshInterval * 1000
            )
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [preferences.autoRefresh, preferences.refreshInterval, ...dependencies])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])
}

/**
 * Hook for managing document visibility and pausing/resuming auto-refresh
 */
export function useVisibilityAwareRefresh(
    refreshFn: () => void,
    dependencies: any[] = []
) {
    const preferences = useAppSelectors.preferences()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const isVisibleRef = useRef(true)

    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisibleRef.current = !document.hidden

            if (isVisibleRef.current && preferences.autoRefresh) {
                // Resume auto-refresh when tab becomes visible
                if (!intervalRef.current) {
                    intervalRef.current = setInterval(
                        refreshFn,
                        preferences.refreshInterval * 1000
                    )
                }
                // Also refresh immediately when becoming visible
                refreshFn()
            } else {
                // Pause auto-refresh when tab is hidden
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Initial setup
        if (preferences.autoRefresh && isVisibleRef.current) {
            intervalRef.current = setInterval(
                refreshFn,
                preferences.refreshInterval * 1000
            )
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [preferences.autoRefresh, preferences.refreshInterval, ...dependencies])
}