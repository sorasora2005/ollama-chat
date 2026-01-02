'use client'

import { useState, useEffect } from 'react'
import { DownloadProgress, PersistedDownloads } from '../types'
import { logger } from '../utils/logger'

const STORAGE_KEY = 'ollama_downloads'
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 hours

export function usePersistedDownloads() {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgress>>({})
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: PersistedDownloads = JSON.parse(stored)
        const now = Date.now()

        // Filter out stale downloads (>24h old)
        const filtered = Object.entries(parsed.downloads || {})
          .filter(([_, dl]) => {
            const age = now - dl.lastUpdateAt
            return age < STALE_THRESHOLD_MS
          })

        const validDownloads = Object.fromEntries(filtered)
        setDownloads(validDownloads)

        // Log stale downloads that were removed
        const staleCount = Object.keys(parsed.downloads || {}).length - Object.keys(validDownloads).length
        if (staleCount > 0) {
          logger.debug(`Removed ${staleCount} stale download(s) (>24h old)`)
        }
      }
    } catch (error) {
      logger.error('Failed to load persisted downloads:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsInitialized(true)
  }, [])

  // Sync to localStorage on changes
  useEffect(() => {
    if (!isInitialized) return

    try {
      const data: PersistedDownloads = {
        version: 1,
        downloads
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      logger.error('Failed to save persisted downloads:', error)
    }
  }, [downloads, isInitialized])

  // Listen for storage events (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed: PersistedDownloads = JSON.parse(e.newValue)
          setDownloads(parsed.downloads || {})
        } catch (error) {
          logger.error('Failed to parse storage event:', error)
        }
      } else if (e.key === STORAGE_KEY && !e.newValue) {
        // Storage was cleared
        setDownloads({})
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const updateDownloadProgress = (modelName: string, update: Partial<DownloadProgress>) => {
    setDownloads(prev => {
      const existing = prev[modelName] || {
        modelName,
        status: 'downloading' as const,
        progress: 0,
        totalBytes: 0,
        completedBytes: 0,
        startedAt: Date.now(),
        lastUpdateAt: Date.now()
      }

      return {
        ...prev,
        [modelName]: {
          ...existing,
          ...update,
          modelName, // Ensure modelName is always set
          lastUpdateAt: Date.now()
        }
      }
    })
  }

  const removeDownload = (modelName: string) => {
    setDownloads(prev => {
      const { [modelName]: _, ...rest } = prev
      return rest
    })
  }

  const clearAll = () => {
    setDownloads({})
  }

  // Computed values
  const allDownloads = Object.values(downloads)
  const activeDownloads = allDownloads.filter(d => d.status === 'downloading')
  const pausedDownloads = allDownloads.filter(d => d.status === 'paused')
  const hasDownloads = allDownloads.length > 0

  return {
    downloads,
    allDownloads,
    activeDownloads,
    pausedDownloads,
    hasDownloads,
    isInitialized,
    updateDownloadProgress,
    removeDownload,
    clearAll
  }
}
