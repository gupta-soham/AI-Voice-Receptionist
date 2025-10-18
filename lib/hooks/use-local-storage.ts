import { useState, useEffect } from 'react'

/**
 * Hook for managing localStorage with SSR safety
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
    // State to store our value
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue
        }

        try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error)
            return initialValue
        }
    })

    // Return a wrapped version of useState's setter function that persists the new value to localStorage
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have the same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value

            // Save state
            setStoredValue(valueToStore)

            // Save to local storage
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore))
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error)
        }
    }

    return [storedValue, setValue]
}

/**
 * Hook for managing sessionStorage with SSR safety
 */
export function useSessionStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue
        }

        try {
            const item = window.sessionStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.warn(`Error reading sessionStorage key "${key}":`, error)
            return initialValue
        }
    })

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value
            setStoredValue(valueToStore)

            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(key, JSON.stringify(valueToStore))
            }
        } catch (error) {
            console.warn(`Error setting sessionStorage key "${key}":`, error)
        }
    }

    return [storedValue, setValue]
}

/**
 * Hook for detecting if localStorage is available
 */
export function useIsLocalStorageAvailable(): boolean {
    const [isAvailable, setIsAvailable] = useState(false)

    useEffect(() => {
        try {
            const testKey = '__localStorage_test__'
            window.localStorage.setItem(testKey, 'test')
            window.localStorage.removeItem(testKey)
            setIsAvailable(true)
        } catch {
            setIsAvailable(false)
        }
    }, [])

    return isAvailable
}