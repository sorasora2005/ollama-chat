/**
 * Page router hook
 * Determines which page to display based on pathname
 */
export function usePageRouter(pathname: string) {
  const getCurrentPage = (): 'chat' | 'models' | 'stats' | 'files' | 'notes' => {
    if (pathname === '/models') return 'models'
    if (pathname === '/stats') return 'stats'
    if (pathname === '/files') return 'files'
    if (pathname === '/notes') return 'notes'
    return 'chat'
  }

  return {
    currentPage: getCurrentPage(),
    isChatPage: getCurrentPage() === 'chat',
    isModelsPage: getCurrentPage() === 'models',
    isStatsPage: getCurrentPage() === 'stats',
    isFilesPage: getCurrentPage() === 'files',
    isNotesPage: getCurrentPage() === 'notes',
  }
}
