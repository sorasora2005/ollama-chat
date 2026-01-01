import { Message, ChatSession, Note } from '../types'

// Convert UTC to JST (UTC+9)
const toJST = (dateString?: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  // Add 9 hours for JST
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  // Format as YYYY-MM-DD HH:MM:SS JST
  const year = jstDate.getUTCFullYear()
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jstDate.getUTCDate()).padStart(2, '0')
  const hours = String(jstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} JST`
}

export const exportChatHistory = (
  messages: Message[],
  currentSessionId: string | null,
  sessions: ChatSession[],
  selectedModel: string,
  username: string
) => {
  if (!currentSessionId || messages.length === 0) {
    throw new Error('エクスポートする履歴がありません')
  }

  // Get session title from sessions list
  const session = sessions.find(s => s.session_id === currentSessionId)
  const sessionTitle = session?.title || 'チャット履歴'

  // Generate markdown content
  let markdown = `# ${sessionTitle}\n\n`
  markdown += `**セッションID:** ${currentSessionId}\n`
  markdown += `**モデル:** ${selectedModel}\n`
  markdown += `**ユーザー:** ${username}\n`
  markdown += `**エクスポート日時:** ${toJST(new Date().toISOString())}\n\n`
  markdown += `---\n\n`

  // Add messages
  messages.forEach((msg) => {
    const roleLabel = msg.role === 'user' ? 'ユーザー' : 'アシスタント'

    markdown += `## ${roleLabel}\n\n`

    // Handle images
    if (msg.images && msg.images.length > 0) {
      markdown += `*画像が含まれています (${msg.images.length}枚)*\n\n`
    }

    // Add message content
    markdown += `${msg.content}\n\n`
    markdown += `---\n\n`
  })

  // Create markdown blob
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // Create download link
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `chat_history_${dateStr}_${currentSessionId.slice(0, 8)}.md`
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const exportNote = (
  note: Note,
  username: string
) => {
  if (!note || !note.content) {
    throw new Error('エクスポートするノートがありません')
  }

  // Generate markdown content
  let markdown = `# ${note.title}\n\n`
  markdown += `**ノートID:** ${note.id}\n`
  markdown += `**セッションID:** ${note.session_id}\n`
  markdown += `**モデル:** ${note.model}\n`
  markdown += `**ユーザー:** ${username}\n`
  markdown += `**作成日時:** ${toJST(note.created_at)}\n`
  if (note.labels && note.labels.length > 0) {
    markdown += `**ラベル:** ${note.labels.join(', ')}\n`
  }
  markdown += `**エクスポート日時:** ${toJST(new Date().toISOString())}\n\n`

  if (note.prompt) {
    markdown += `## プロンプト\n\n`
    markdown += `${note.prompt}\n\n`
  }

  markdown += `---\n\n`
  markdown += `## ノート内容\n\n`
  markdown += `${note.content}\n\n`

  // Create markdown blob
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // Create download link
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `note_${dateStr}_${note.id}.md`
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

