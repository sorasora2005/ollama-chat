'use client'

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useTheme } from '../hooks/useTheme'

interface MessageContentProps {
  content: string
  isDarkMode?: boolean
}

export function MessageContent({ content, isDarkMode: isDarkModeProp }: MessageContentProps) {
  const { isDarkMode } = useTheme()
  const isActuallyDark = isDarkModeProp !== undefined ? isDarkModeProp : isDarkMode

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''

            return !inline && language ? (
              <div className="relative my-4">
                <div className="absolute right-2 top-2 text-xs text-gray-400 bg-gray-800 dark:bg-gray-700 px-2 py-1 rounded">
                  {language}
                </div>
                <SyntaxHighlighter
                  style={isActuallyDark ? vscDarkPlus : atomOneLight}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.5rem',
                    padding: '1.5rem 1rem 1rem 1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono`}
                {...props}
              >
                {children}
              </code>
            )
          },
          p({ children }: any) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          ul({ children }: any) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          },
          ol({ children }: any) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          },
          li({ children }: any) {
            return <li className="ml-4">{children}</li>
          },
          h1({ children }: any) {
            return <h1 className="text-2xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>
          },
          h2({ children }: any) {
            return <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h2>
          },
          h3({ children }: any) {
            return <h3 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h3>
          },
          h4({ children }: any) {
            return <h4 className="text-base font-semibold mb-2 mt-2 first:mt-0">{children}</h4>
          },
          blockquote({ children }: any) {
            return (
              <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-2 italic text-gray-700 dark:text-gray-300">
                {children}
              </blockquote>
            )
          },
          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {children}
              </a>
            )
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }: any) {
            return (
              <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
            )
          },
          tbody({ children }: any) {
            return <tbody>{children}</tbody>
          },
          tr({ children }: any) {
            return <tr className="border-b border-gray-300 dark:border-gray-600">{children}</tr>
          },
          th({ children }: any) {
            return (
              <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            )
          },
          td({ children }: any) {
            return (
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                {children}
              </td>
            )
          },
          hr() {
            return <hr className="my-4 border-gray-300 dark:border-gray-600" />
          },
          pre({ children }: any) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
