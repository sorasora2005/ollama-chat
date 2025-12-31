import { useState, useEffect } from 'react'

export function useDefaultModel() {
  const [defaultModel, setDefaultModelState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem('defaultModel')
    if (stored) {
      setDefaultModelState(stored)
    }
  }, [])

  const setDefaultModel = (modelName: string) => {
    setDefaultModelState(modelName)
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultModel', modelName)
    }
  }

  const clearDefaultModel = () => {
    setDefaultModelState(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('defaultModel')
    }
  }

  return {
    defaultModel,
    setDefaultModel,
    clearDefaultModel,
  }
}
