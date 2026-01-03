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
  newsapi?: string
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

export interface PromptTemplate {
  id: number
  user_id: number
  name: string
  description?: string
  prompt_text: string
  categories?: string[]
  is_favorite: number
  is_system_prompt: number
  use_count: number
  created_at: string
  updated_at: string
}

// Debate Types

export interface DebateParticipant {
  id: number
  debate_session_id: number
  model_name: string
  position: string | null
  participant_order: number
  color: string | null
  created_at: string
}

export interface DebateSession {
  id: number
  creator_id: number
  title: string
  topic: string
  status: 'setup' | 'active' | 'paused' | 'completed'
  config: {
    max_rounds?: number
    turn_timeout?: number
    rules?: string
  }
  winner_participant_id: number | null
  created_at: string
  updated_at: string
  completed_at: string | null
  participants: DebateParticipant[]
}

export interface DebateMessage {
  id: number
  debate_session_id: number
  participant_id: number | null  // null = moderator
  content: string
  round_number: number
  turn_number: number
  message_type: 'argument' | 'moderator' | 'clarification' | 'rebuttal'
  prompt_tokens: number | null
  completion_tokens: number | null
  response_time: number | null
  created_at: string
}

export interface DebateEvaluation {
  id: number
  debate_session_id: number
  participant_id: number
  evaluator_model: string
  qualitative_feedback: string | null
  scores: {
    clarity?: number
    logic?: number
    persuasiveness?: number
    evidence?: number
    overall?: number
  } | null
  created_at: string
}

export interface DebateVote {
  id: number
  debate_session_id: number
  user_id: number
  winner_participant_id: number
  reasoning: string | null
  created_at: string
}

export interface DebateState {
  currentRound: number
  currentTurn: number
  isGenerating: boolean
  currentParticipantId: number | null
}

