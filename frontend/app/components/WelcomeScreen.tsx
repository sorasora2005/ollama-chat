'use client'

import { ImageIcon, FileText, Sparkles, Lightbulb } from 'lucide-react'

interface WelcomeScreenProps {
  username: string
}

export default function WelcomeScreen({ username }: WelcomeScreenProps) {
  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center flex-1">
      <div className="mb-6 relative">
        <svg width="120" height="120" viewBox="0 0 120 120" className="relative z-10">
          <defs>
            <linearGradient id="glow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="45" fill="url(#glow-gradient)" opacity="0.3" filter="url(#glow)" />
          <g transform="translate(60, 60)">
            <path
              d="M 0 -30 L 8 -8 L 30 -8 L 12 4 L 20 26 L 0 14 L -20 26 L -12 4 L -30 -8 L -8 -8 Z"
              fill="url(#glow-gradient)"
              filter="url(#glow)"
              className="drop-shadow-lg"
            />
          </g>
          <g transform="translate(30, 25)">
            <path
              d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
              fill="#3b82f6"
              opacity="0.8"
              filter="url(#glow)"
            />
          </g>
          <g transform="translate(90, 35)">
            <path
              d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
              fill="#8b5cf6"
              opacity="0.8"
              filter="url(#glow)"
            />
          </g>
          <g transform="translate(25, 75)">
            <path
              d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
              fill="#3b82f6"
              opacity="0.8"
              filter="url(#glow)"
            />
          </g>
          <g transform="translate(95, 85)">
            <path
              d="M 0 -8 L 2 -2 L 8 -2 L 3 1 L 5 7 L 0 4 L -5 7 L -3 1 L -8 -2 L -2 -2 Z"
              fill="#9333ea"
              opacity="0.8"
              filter="url(#glow)"
            />
          </g>
          <circle cx="20" cy="20" r="2" fill="#3b82f6" opacity="0.9" filter="url(#glow)" />
          <circle cx="100" cy="30" r="2" fill="#9333ea" opacity="0.9" filter="url(#glow)" />
          <circle cx="15" cy="90" r="2" fill="#3b82f6" opacity="0.9" filter="url(#glow)" />
          <circle cx="105" cy="95" r="2" fill="#9333ea" opacity="0.9" filter="url(#glow)" />
        </svg>
      </div>
      <div className="text-2xl font-semibold mb-2 text-black dark:text-white">{username} さん</div>
      <div className="text-xl text-gray-600 dark:text-gray-400 mb-8">何から始めますか?</div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
          <ImageIcon className="w-6 h-6" />
          <span>画像の作成</span>
        </button>
        <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
          <FileText className="w-6 h-6" />
          <span>何でも書く</span>
        </button>
        <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
          <Lightbulb className="w-6 h-6" />
          <span>知識習得サポート</span>
        </button>
        <button className="p-4 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#3d3d3d] rounded-xl flex items-center gap-3 transition-colors text-black dark:text-white">
          <Sparkles className="w-6 h-6" />
          <span>一日を盛り上げる</span>
        </button>
      </div>
    </div>
  )
}


