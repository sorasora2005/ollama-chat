/**
 * Utility functions for download management
 */

/**
 * Format bytes to human-readable string
 * @param bytes Number of bytes
 * @returns Formatted string (e.g., "2.3 GB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Format milliseconds to human-readable time string
 * @param ms Milliseconds
 * @returns Formatted string (e.g., "2時間30分")
 */
export function formatDownloadTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}時間`
  }
  return `${hours}時間${remainingMinutes}分`
}

/**
 * Check if a download is stale (older than threshold)
 * @param lastUpdateAt Timestamp of last update
 * @param thresholdHours Hours threshold (default: 24)
 * @returns True if download is stale
 */
export function isStaleDownload(lastUpdateAt: number, thresholdHours: number = 24): boolean {
  const age = Date.now() - lastUpdateAt
  return age > thresholdHours * 60 * 60 * 1000
}

/**
 * Calculate estimated time remaining
 * @param completedBytes Bytes downloaded
 * @param totalBytes Total bytes
 * @param startedAt Start timestamp
 * @returns Estimated ms remaining, or null if cannot calculate
 */
export function estimateTimeRemaining(
  completedBytes: number,
  totalBytes: number,
  startedAt: number
): number | null {
  if (completedBytes === 0 || totalBytes === 0 || completedBytes >= totalBytes) {
    return null
  }

  const elapsedMs = Date.now() - startedAt
  const bytesPerMs = completedBytes / elapsedMs
  const remainingBytes = totalBytes - completedBytes
  const estimatedRemainingMs = remainingBytes / bytesPerMs

  return Math.round(estimatedRemainingMs)
}
