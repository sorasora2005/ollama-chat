export const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
  ref.current?.scrollIntoView({ behavior: 'smooth' })
}

export const scrollToTop = (ref: React.RefObject<HTMLDivElement>) => {
  ref.current?.scrollIntoView({ behavior: 'smooth' })
}

export const scrollToLastSentMessage = (
  lastSentMessageId: string | null,
  messageRefs: React.RefObject<Map<string, HTMLDivElement>>
) => {
  if (lastSentMessageId && messageRefs.current) {
    const messageElement = messageRefs.current.get(lastSentMessageId)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}


