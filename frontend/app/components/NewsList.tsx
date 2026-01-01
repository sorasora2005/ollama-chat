'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../utils/api'
import { Newspaper, Calendar, ExternalLink, MessageSquare, X, Settings, Key, ArrowLeft } from 'lucide-react'
import ApiKeyManager from './ApiKeyManager'

// Constants
const CATEGORIES = [
  { id: 'general', label: '総合' },
  { id: 'business', label: 'ビジネス' },
  { id: 'technology', label: 'テクノロジー' },
  { id: 'science', label: '科学' },
  { id: 'entertainment', label: 'エンタメ' },
  { id: 'sports', label: 'スポーツ' },
  { id: 'health', label: '健康' },
]

interface Article {
  source: { id: string | null; name: string }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsListProps {
  userId?: number // Make optional but we should pass it
  onChatAboutArticle: (article: Article) => void
  activeArticle?: Article | null
  onBackToNews?: () => void
  children?: React.ReactNode
}

export default function NewsList({ userId, onChatAboutArticle, activeArticle, onBackToNews, children }: NewsListProps) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('general')
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showApiKeyManager, setShowApiKeyManager] = useState(false)
  const [savingApiKey, setSavingApiKey] = useState(false)
  const [currentApiKey, setCurrentApiKey] = useState<string>('')

  // Ref for observer
  const observerTarget = useRef(null)

  useEffect(() => {
    if (userId) {
      // Reset state on category change
      setArticles([])
      setNextPage(null)
      fetchNews(true) // Initial fetch
    }
  }, [category, userId])

  // Fetch current API key status when modal opens
  useEffect(() => {
    if (showApiKeyManager && userId) {
      const fetchApiKey = async () => {
        try {
          const keyInfo = await api.getApiKey(userId, 'newsapi')
          if (keyInfo) {
            // If key exists, show a placeholder to indicate it's set
            setCurrentApiKey('••••••••••••••••')
          } else {
            setCurrentApiKey('')
          }
        } catch (err) {
          // If error or no key found, set empty
          setCurrentApiKey('')
        }
      }
      fetchApiKey()
    } else {
      // Reset when modal closes
      setCurrentApiKey('')
    }
  }, [showApiKeyManager, userId])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && nextPage && !loading) {
          fetchNews(false)
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [nextPage, loading])

  const fetchNews = async (isInitial: boolean) => {
    if (!userId) return

    setLoading(true)
    if (isInitial) setError(null)

    try {
      const pageToFetch = isInitial ? null : nextPage
      const response = await api.getNews(userId, category, pageToFetch)

      setArticles(prev => isInitial ? response.articles : [...prev, ...response.articles])
      setNextPage(response.nextPage || null)

    } catch (err: any) {
      console.error('Failed to fetch news:', err)
      if (err.response?.data?.detail === 'NEWS_API_KEY_MISSING' || err.response?.data?.detail === 'NEWS_API_KEY_INVALID') {
        setError('NEWS_API_KEY_MISSING')
      } else {
        setError('記事をうまく取得できませんでした。')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveApiKey = async (provider: 'gemini' | 'gpt' | 'grok' | 'claude' | 'newsapi', apiKey: string) => {
    if (!userId) return

    setSavingApiKey(true)
    try {
      // 1. Test Key 
      // (Actually saveApiKey usually tests it in other parts of app, but here we can rely on our backend endpoint which might test it or we can use the test endpoint first)
      // The current ApiKeyManager pattern usually calls a test then save.
      // But looking at api.saveApiKey implementation in backend/routers/api_keys.py, it DOES test before saving.

      const response = await api.saveApiKey(userId, provider, apiKey)
      if (response && response.id) {
        setShowApiKeyManager(false)
        fetchNews(true) // Retry fetching news
      }

    } catch (err: any) {
      alert(`APIキーの保存に失敗しました: ${err.response?.data?.detail || err.message}`)
    } finally {
      setSavingApiKey(false)
    }
  }

  const getProviderDisplayName = (p: string) => {
    if (p === 'newsapi') return 'newsdata.io'
    return p
  }

  // Article Detail Modal
  const ArticleModal = ({ article, onClose }: { article: Article; onClose: () => void }) => {
    if (!article) return null

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-[#2d2d2d] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start sticky top-0 bg-white dark:bg-[#2d2d2d] z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{article.title}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Newspaper className="w-4 h-4" />
                  {article.source.name}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(article.publishedAt).toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            {article.urlToImage && (
              <img
                src={article.urlToImage}
                alt={article.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}

            <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
              {article.description || '詳細な説明はありません。'}
            </p>

            {article.content && (
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6 whitespace-pre-wrap">
                {article.content.replace(/\[\+\d+ chars\]$/, '')}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  onChatAboutArticle(article)
                  onClose()
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                このニュースについてAIと話す
              </button>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                元の記事を読む
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }


  if (activeArticle) {
    return (
      <div className="h-full flex flex-col">
        {/* Back Navigation */}
        <div className="max-w-3xl mx-auto w-full mt-4 mb-4 px-1">
          <button
            onClick={onBackToNews}
            className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            ニュース一覧に戻る
          </button>
        </div>

        {/* Active Article View */}
        <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mb-6">
          <div className="bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="flex h-24 md:h-28">
              <div
                className="relative w-24 md:w-36 overflow-hidden bg-gray-200 dark:bg-gray-800 cursor-pointer flex-shrink-0"
                onClick={() => window.open(activeArticle.url, '_blank', 'noopener,noreferrer')}
              >
                {activeArticle.urlToImage ? (
                  <img
                    src={activeArticle.urlToImage}
                    alt={activeArticle.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Newspaper className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate max-w-[150px]">{activeArticle.source.name}</span>
                  <span className="shrink-0">{new Date(activeArticle.publishedAt).toLocaleDateString('ja-JP')}</span>
                </div>
                <h2
                  className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
                  onClick={() => window.open(activeArticle.url, '_blank', 'noopener,noreferrer')}
                >
                  {activeArticle.title}
                </h2>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex gap-4">
                    <a
                      href={activeArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 text-xs flex items-center gap-1 hover:underline"
                    >
                      記事の全文を読む <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="w-8 h-8" />
            最新ニュース
          </h1>
        </div>
        <button
          onClick={() => setShowApiKeyManager(true)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors relative group"
        >
          <Key className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <span className="absolute right-0 top-full mt-2 w-max px-2 py-1 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            APIキー設定
          </span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${category === cat.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative min-h-[50vh] w-full">


        {/* Grid List */}
        <div className="w-full">
          {error ? (
            <div className="text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
              <p className="text-red-600 dark:text-red-400 font-medium mb-4">
                {error === 'NEWS_API_KEY_MISSING'
                  ? 'News APIキーが未設定、または無効です。'
                  : error}
              </p>
              {error === 'NEWS_API_KEY_MISSING' && userId ? (
                <button
                  onClick={() => setShowApiKeyManager(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  APIキーを設定する
                </button>
              ) : (
                <button
                  onClick={() => fetchNews(true)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                >
                  再試行する
                </button>
              )}
            </div>
          ) : articles.length === 0 && !loading ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 mb-4">記事が見つかりませんでした。</p>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-400">APIキーの設定を確認してください</p>
                {userId && (
                  <button
                    onClick={() => setShowApiKeyManager(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    APIキーを設定する
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, idx) => (
                <div
                  key={`${article.url}-${idx}`}
                  className="group bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  <div
                    onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                    className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-800 cursor-pointer"
                  >
                    {article.urlToImage ? (
                      <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Newspaper className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded">
                      {article.source.name}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3
                      onClick={() => window.open(article.url, '_blank', 'noopener,noreferrer')}
                      className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      {article.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                      <span>{new Date(article.publishedAt).toLocaleDateString('ja-JP')}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onChatAboutArticle(article)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        AIと話す
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Skeleton Loaders for initial load or loading more */}
              {loading && (
                [...Array(6)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="group bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-800 animate-pulse" />
                    <div className="p-5 flex-1 flex flex-col space-y-3">
                      <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          <div ref={observerTarget} className="h-10 w-full mt-4 flex items-center justify-center">
            {loading && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
      </div>

      {/* Api Key Manager Modal */}
      <div className={showApiKeyManager ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm' : 'hidden'}>
        <div className="bg-white dark:bg-[#252525] rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-lg">APIキー設定</h3>
            <button
              onClick={() => setShowApiKeyManager(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <ApiKeyManager
              isOpen={true} // Always open as it's inside a modal wrapper
              onClose={() => setShowApiKeyManager(false)}
              provider="newsapi"
              initialValue={currentApiKey}
              isUpdating={savingApiKey}
              onSave={handleSaveApiKey}
              getFamilyDisplayName={getProviderDisplayName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

