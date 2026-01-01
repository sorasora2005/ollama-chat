export interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
  model?: string
  session_id?: string
  images?: string[]  // Base64 encoded images
  id?: string  // Unique ID for React key
  streamingComplete?: boolean  // Flag to track if streaming is complete
  is_cancelled?: boolean  // Flag to indicate if generation was cancelled
}

export interface Model {
  name: string
  size?: number
  downloaded?: boolean
  family?: string
  type?: string
  description?: string
}

export interface ChatSession {
  session_id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  snippet?: string  // For search results
  model?: string  // Model used in this session
}

export interface UserInfo {
  id: number
  username: string
  created_at: string
  session_count: number
  message_count: number
}

export interface UserFile {
  message_id: number
  session_id: string
  filename: string
  images: string[]
  created_at: string
  model?: string
}

export interface Note {
  id: number
  user_id: number
  session_id: string
  title: string
  content: string
  model: string
  prompt: string
  labels?: string[]
  is_deleted?: number
  created_at: string
  snippet?: string  // For search results
}

export interface CloudApiKeys {
  gemini?: string
  gpt?: string
  grok?: string
  claude?: string
}

export interface DownloadProgress {
  modelName: string
  status: 'downloading' | 'paused' | 'stopping'
  progress: number  // 0-100
  totalBytes: number
  completedBytes: number
  digest?: string
  startedAt: number
  lastUpdateAt: number
  error?: string
}

export interface PersistedDownloads {
  version: number
  downloads: Record<string, DownloadProgress>
}

