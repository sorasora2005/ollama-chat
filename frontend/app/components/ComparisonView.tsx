'use client'

import { useState, useEffect } from 'react'
import { Copy, RotateCcw, Loader2 } from 'lucide-react'
import { Message } from '../types'

interface ModelResponse {
  model: string
  messages: Message[]
  loading: boolean
  error?: string
  responseTime?: number
  tokens?: { prompt: number; completion: number }
}

interface ComparisonViewProps {
  modelResponses: ModelResponse[]
  onCopyMessage: (content: string, modelIndex: number) => void
  onRegenerateForModel: (modelName: string) => void
  copiedIndex: number | null
}

export default function ComparisonView({
  modelResponses,
  onCopyMessage,
  onRegenerateForModel,
  copiedIndex,
}: ComparisonViewProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className={`grid gap-4 h-full p-4 ${
        modelResponses.length === 2 ? 'grid-cols-2' :
        modelResponses.length === 3 ? 'grid-cols-3' :
        'grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
      }`}>
        {modelResponses.map((modelResponse, modelIndex) => (
          <div
            key={modelResponse.model}
            className="flex flex-col border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1a1a1a] overflow-hidden"
          >
            {/* Model Header */}
            <div className="p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#252525]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-black dark:text-white truncate">
                  {modelResponse.model}
                </h3>
                {modelResponse.responseTime !== undefined && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {modelResponse.responseTime.toFixed(1)}s
                  </span>
                )}
              </div>
              {modelResponse.tokens && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {modelResponse.tokens.prompt + modelResponse.tokens.completion} tokens
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {modelResponse.error ? (
                <div className="text-red-500 dark:text-red-400 text-sm">
                  Error: {modelResponse.error}
                </div>
              ) : modelResponse.messages.length === 0 && !modelResponse.loading ? (
                <div className="text-gray-400 dark:text-gray-500 text-sm text-center mt-8">
                  Waiting for response...
                </div>
              ) : (
                modelResponse.messages
                  .filter(msg => msg.role === 'assistant')
                  .map((message, msgIndex) => (
                    <div key={msgIndex} className="space-y-2">
                      <div className="text-sm text-black dark:text-white whitespace-pre-wrap break-words">
                        {message.content}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => onCopyMessage(message.content, modelIndex)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-colors"
                          title="コピー"
                        >
                          <Copy className={`w-3.5 h-3.5 ${
                            copiedIndex === modelIndex
                              ? 'text-green-500'
                              : 'text-gray-600 dark:text-gray-400'
                          }`} />
                        </button>
                        <button
                          onClick={() => onRegenerateForModel(modelResponse.model)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-lg transition-colors"
                          title="再生成"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))
              )}

              {/* Loading Indicator */}
              {modelResponse.loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>生成中...</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
