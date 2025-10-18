import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook for managing optimistic updates with React Query
 */
export function useOptimisticUpdates() {
    const queryClient = useQueryClient()

    const optimisticUpdate = useCallback(
        <T>(
            queryKey: string[],
            updater: (oldData: T | undefined) => T,
            rollbackData?: T
        ) => {
            // Cancel any outgoing refetches
            queryClient.cancelQueries({ queryKey })

            // Snapshot the previous value
            const previousData = queryClient.getQueryData<T>(queryKey)

            // Optimistically update to the new value
            queryClient.setQueryData<T>(queryKey, updater)

            // Return a context object with the snapshotted value and rollback function
            return {
                previousData,
                rollback: () => {
                    queryClient.setQueryData<T>(queryKey, rollbackData || previousData)
                },
            }
        },
        [queryClient]
    )

    const invalidateQueries = useCallback(
        (queryKey: string[]) => {
            queryClient.invalidateQueries({ queryKey })
        },
        [queryClient]
    )

    const refetchQueries = useCallback(
        (queryKey: string[]) => {
            queryClient.refetchQueries({ queryKey })
        },
        [queryClient]
    )

    return {
        optimisticUpdate,
        invalidateQueries,
        refetchQueries,
    }
}

/**
 * Hook for managing optimistic list operations (add, update, delete)
 */
export function useOptimisticList<T extends { id: string }>() {
    const { optimisticUpdate } = useOptimisticUpdates()

    const optimisticAdd = useCallback(
        (queryKey: string[], newItem: T) => {
            return optimisticUpdate<{ items: T[]; total: number }>(
                queryKey,
                (oldData) => {
                    if (!oldData) return { items: [newItem], total: 1 }
                    return {
                        items: [newItem, ...oldData.items],
                        total: oldData.total + 1,
                    }
                }
            )
        },
        [optimisticUpdate]
    )

    const optimisticUpdate_ = useCallback(
        (queryKey: string[], updatedItem: T) => {
            return optimisticUpdate<{ items: T[]; total: number }>(
                queryKey,
                (oldData) => {
                    if (!oldData) return { items: [updatedItem], total: 1 }
                    return {
                        items: oldData.items.map((item) =>
                            item.id === updatedItem.id ? updatedItem : item
                        ),
                        total: oldData.total,
                    }
                }
            )
        },
        [optimisticUpdate]
    )

    const optimisticDelete = useCallback(
        (queryKey: string[], itemId: string) => {
            return optimisticUpdate<{ items: T[]; total: number }>(
                queryKey,
                (oldData) => {
                    if (!oldData) return { items: [], total: 0 }
                    return {
                        items: oldData.items.filter((item) => item.id !== itemId),
                        total: Math.max(0, oldData.total - 1),
                    }
                }
            )
        },
        [optimisticUpdate]
    )

    return {
        optimisticAdd,
        optimisticUpdate: optimisticUpdate_,
        optimisticDelete,
    }
}