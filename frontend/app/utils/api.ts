import axios from 'axios'
import { Message, Model, ChatSession, UserInfo, UserFile, Note } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  // Models
  getModels: async (): Promise<Model[]> => {
    const response = await axios.get(`${API_URL}/api/models`)
    return response.data.models || []
  },

  pullModel: async (modelName: string, signal?: AbortSignal): Promise<Response> => {
    return fetch(`${API_URL}/api/models/pull/${encodeURIComponent(modelName)}`, {
      signal,
    })
  },

  deleteModel: async (modelName: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/models/${encodeURIComponent(modelName)}`)
  },

  // Users
  getUsers: async (): Promise<UserInfo[]> => {
    const response = await axios.get(`${API_URL}/api/users`)
    return response.data.users || []
  },

  createUser: async (username: string): Promise<UserInfo> => {
    const response = await axios.post(`${API_URL}/api/users`, { username })
    return response.data
  },

  // Chat
  sendMessage: async (request: {
    user_id: number
    message: string
    model: string
    session_id?: string
    images?: string[]
  }, signal?: AbortSignal): Promise<Response> => {
    return fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal,
    })
  },

  getChatHistory: async (userId: number, sessionId?: string): Promise<{
    messages: Message[]
    session_model?: string
  }> => {
    const url = sessionId
      ? `${API_URL}/api/chat/history/${userId}?session_id=${sessionId}`
      : `${API_URL}/api/chat/history/${userId}`
    const response = await axios.get(url)
    return response.data
  },

  getChatSessions: async (userId: number): Promise<ChatSession[]> => {
    const response = await axios.get(`${API_URL}/api/chat/sessions/${userId}`)
    return response.data.sessions || []
  },

  searchChatHistory: async (userId: number, query: string): Promise<ChatSession[]> => {
    const response = await axios.get(`${API_URL}/api/chat/search/${userId}`, {
      params: { q: query.trim() }
    })
    return response.data.results || []
  },

  getUserFiles: async (userId: number): Promise<UserFile[]> => {
    const response = await axios.get(`${API_URL}/api/chat/files/${userId}`)
    return response.data.files || []
  },

  // Upload
  uploadFile: async (file: File): Promise<{
    file_id: string
    images: string[]
    image_paths: string[]
    filename: string
  }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await axios.post(`${API_URL}/api/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Feedback
  createFeedback: async (userId: number, messageId: number, feedbackType: 'positive' | 'negative'): Promise<{
    id: number
    message: string
  }> => {
    const response = await axios.post(`${API_URL}/api/feedback`, {
      user_id: userId,
      message_id: messageId,
      feedback_type: feedbackType
    })
    return response.data
  },

  getFeedbackStats: async (userId: number, model?: string): Promise<{
    user_id: number
    stats: Array<{
      model: string
      total_messages: number
      total_prompt_tokens: number
      total_completion_tokens: number
      total_tokens: number
      positive_feedback_count: number
      negative_feedback_count: number
      total_feedback_count: number
    }>
  }> => {
    const url = model
      ? `${API_URL}/api/feedback/stats/${userId}?model=${encodeURIComponent(model)}`
      : `${API_URL}/api/feedback/stats/${userId}`
    const response = await axios.get(url)
    return response.data
  },

  // Notes
  createNote: async (request: {
    user_id: number
    session_id: string
    model: string
    prompt: string
    labels?: string[]
  }): Promise<Note> => {
    const response = await axios.post(`${API_URL}/api/notes`, request)
    return response.data
  },

  getNotes: async (userId: number): Promise<Note[]> => {
    const response = await axios.get(`${API_URL}/api/notes/${userId}`)
    return response.data.notes || []
  },

  getNoteDetail: async (noteId: number): Promise<Note> => {
    const response = await axios.get(`${API_URL}/api/notes/detail/${noteId}`)
    return response.data
  },

  searchNotes: async (userId: number, query: string): Promise<Note[]> => {
    const response = await axios.get(`${API_URL}/api/notes/search/${userId}`, {
      params: { q: query.trim() }
    })
    return response.data.results || []
  },

  deleteNote: async (noteId: number): Promise<void> => {
    await axios.delete(`${API_URL}/api/notes/${noteId}`)
  },

  getTrashNotes: async (userId: number): Promise<Note[]> => {
    const response = await axios.get(`${API_URL}/api/notes/trash/${userId}`)
    return response.data.notes || []
  },

  restoreNote: async (noteId: number): Promise<void> => {
    await axios.post(`${API_URL}/api/notes/restore/${noteId}`)
  },

  permanentDeleteNote: async (noteId: number): Promise<void> => {
    await axios.delete(`${API_URL}/api/notes/permanent/${noteId}`)
  },

  updateNoteLabels: async (noteId: number, labels: string[]): Promise<void> => {
    await axios.post(`${API_URL}/api/notes/${noteId}/labels`, { labels })
  },

  bulkRestoreNotes: async (noteIds: number[]): Promise<void> => {
    await axios.post(`${API_URL}/api/notes/bulk-restore`, noteIds)
  },

  bulkPermanentDeleteNotes: async (noteIds: number[]): Promise<void> => {
    await axios.post(`${API_URL}/api/notes/bulk-permanent`, noteIds)
  },

  // Cloud API Keys
  testApiKey: async (userId: number, provider: string, apiKey: string): Promise<{
    valid: boolean
    message: string
  }> => {
    const response = await axios.post(`${API_URL}/api/api-keys/test`, {
      user_id: userId,
      provider,
      api_key: apiKey
    })
    return response.data
  },

  saveApiKey: async (userId: number, provider: string, apiKey: string): Promise<{
    id: number
    user_id: number
    provider: string
    created_at: string
    updated_at: string
  }> => {
    const response = await axios.post(`${API_URL}/api/api-keys`, {
      user_id: userId,
      provider,
      api_key: apiKey
    })
    return response.data
  },

  getApiKeys: async (userId: number): Promise<Array<{
    id: number
    user_id: number
    provider: string
    created_at: string
    updated_at: string
  }>> => {
    const response = await axios.get(`${API_URL}/api/api-keys/${userId}`)
    return response.data || []
  },

  getApiKey: async (userId: number, provider: string): Promise<{
    id: number
    user_id: number
    provider: string
    created_at: string
    updated_at: string
  } | null> => {
    const response = await axios.get(`${API_URL}/api/api-keys/${userId}/${provider}`)
    return response.data || null
  },

  deleteApiKey: async (userId: number, provider: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/api-keys/${userId}/${provider}`)
  },

  // URL Scraping
  scrapeUrl: async (url: string): Promise<{
    url: string
    title: string
    content: string
    error?: string
  }> => {
    const response = await axios.post(`${API_URL}/api/scrape`, { url })
    return response.data
  },

  // News
  getNews: async (userId: number, category: string = 'general', page?: string | null, q?: string | null): Promise<{
    status: string
    totalResults: number
    nextPage?: string | null
    articles: Array<{
      source: { id: string | null; name: string }
      author: string | null
      title: string
      description: string | null
      url: string
      urlToImage: string | null
      publishedAt: string
      content: string | null
    }>
  }> => {
    const params: any = { user_id: userId, category }
    if (page) params.page = page
    if (q) params.q = q

    const response = await axios.get(`${API_URL}/api/news`, { params })
    return response.data
  },
}

