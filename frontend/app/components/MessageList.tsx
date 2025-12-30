'use client'

import { Copy, RotateCcw } from 'lucide-react'
import { Message } from '../types'

interface MessageListProps {
  messages: Message[]
  loading: boolean
  assistantMessageIndex: number | null
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  messagesStartRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  copiedIndex: number | null
  clickedButton: { type: string, index: number } | null
  onCopyMessage: (content: string, index: number) => void
  onRegenerateMessage: (index: number) => void
}

export default function MessageList({
  messages,
  loading,
  assistantMessageIndex,
  messageRefs,
  messagesStartRef,
  messagesEndRef,
  copiedIndex,
  clickedButton,
  onCopyMessage,
  onRegenerateMessage,
}: MessageListProps) {
  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 flex flex-col">
      <div ref={messagesStartRef} />
      {messages.map((message, index) => {
        const isNewAssistantMessage = message.role === 'assistant' && 
          (message.id?.startsWith('assistant-') || message.id?.startsWith('error-') || message.id?.startsWith('cancelled-'))
        const isStreaming = loading && assistantMessageIndex === index
        const messageLength = message.content.replace(/\s+/g, '').length
        const isShortMessage = messageLength < 50

        return (
          <div
            key={message.id || `msg-${index}`}
            data-message-id={message.id}
            ref={(el) => {
              if (el && message.id) {
                messageRefs.current.set(message.id, el)
              }
            }}
            className={`flex gap-4 group ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
              isNewAssistantMessage ? 'animate-slide-down-fade-in' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
                {isStreaming ? (
                  <>
                    <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
                      <defs>
                        <linearGradient id={`spinning-gradient-${message.id || index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="16"
                        cy="16"
                        r="13"
                        fill="none"
                        stroke={`url(#spinning-gradient-${message.id || index})`}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="50 30"
                        transform="rotate(-90 16 16)"
                      />
                    </svg>
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 absolute"></div>
                )}
                <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
                <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
              </div>
            )}
            <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
              {message.role === 'user' ? (
                <div
                  className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-black dark:text-white`}
                  style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {message.images && message.images.length > 0 && (() => {
                    const fileMatch1 = message.content.match(/ファイル:\s*(.+?)(?:\n|$)/)
                    const fileMatch2 = message.content.match(/ファイル:\s*(.+)/)
                    const filename = (fileMatch1 ? fileMatch1[1].trim() : '') || (fileMatch2 ? fileMatch2[1].trim() : '')
                    const contentLower = message.content.toLowerCase()
                    const isPdf = filename.toLowerCase().endsWith('.pdf') ||
                      (contentLower.includes('.pdf') && (contentLower.includes('ファイル') || message.images.length > 1))
                    return (
                      <div className={`mb-3 space-y-2 ${isPdf ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
                        <img
                          key={0}
                          src={`data:image/png;base64,${message.images[0]}`}
                          alt={`Uploaded image`}
                          className="max-w-full rounded-lg"
                          style={{ maxHeight: '400px' }}
                        />
                        {message.images.length > 1 && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            +{message.images.length - 1}ページ
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </div>
                </div>
              ) : (
                <div
                  className={`${isShortMessage ? 'max-w-fit' : 'max-w-[80%]'} rounded-2xl px-4 py-3 text-black dark:text-white`}
                  style={isShortMessage ? {} : { wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {message.images && message.images.length > 0 && (
                    <div className="mb-3 space-y-2">
                      <img
                        key={0}
                        src={`data:image/png;base64,${message.images[0]}`}
                        alt={`Uploaded image`}
                        className="max-w-full rounded-lg"
                        style={{ maxHeight: '400px' }}
                      />
                      {message.images.length > 1 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          +{message.images.length - 1}ページ
                        </div>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap" style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </div>
                </div>
              )}
              {message.role === 'assistant' && !isStreaming && (message.streamingComplete === true || message.streamingComplete === undefined) && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => {
                      onCopyMessage(message.content, index)
                    }}
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all ml-1 ${
                      clickedButton?.type === 'copy' && clickedButton?.index === index 
                        ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' 
                        : ''
                    }`}
                    title="コピー"
                  >
                    <Copy className={`w-4 h-4 transition-colors ${copiedIndex === index ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => onRegenerateMessage(index)}
                    disabled={loading}
                    className={`p-2 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-all disabled:opacity-50 ${
                      clickedButton?.type === 'regenerate' && clickedButton?.index === index 
                        ? 'animate-float bg-gray-200 dark:bg-[#3d3d3d]' 
                        : ''
                    }`}
                    title="再生成"
                  >
                    <RotateCcw className={`w-4 h-4 transition-colors ${
                      clickedButton?.type === 'regenerate' && clickedButton?.index === index 
                        ? 'text-blue-500' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {loading && assistantMessageIndex === null && (
        <div className="flex gap-4 justify-start">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative">
            <svg className="w-8 h-8 absolute animate-spin" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="spinning-gradient-loading" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="url(#spinning-gradient-loading)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="50 30"
                transform="rotate(-90 16 16)"
              />
            </svg>
            <div className="w-6 h-6 rounded-full bg-white dark:bg-[#1a1a1a] absolute"></div>
            <span className="text-black dark:text-white text-xs font-bold relative z-10">AI</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

