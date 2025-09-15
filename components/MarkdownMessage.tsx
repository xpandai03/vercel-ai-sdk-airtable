import React from 'react'

interface MarkdownMessageProps {
  content: string
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  // Enhanced markdown parsing for bold, italic, links, and line breaks
  const parseMarkdown = (text: string): React.ReactNode => {
    // Split by line breaks first
    const lines = text.split('\n')
    
    return lines.map((line, lineIndex) => {
      // Skip empty lines but preserve spacing
      if (line.trim() === '') {
        return <br key={lineIndex} />
      }
      
      // Parse inline markdown
      const parts: React.ReactNode[] = []
      let currentText = line
      let keyCounter = 0
      
      // Replace URLs with clickable links
      currentText = currentText.replace(/https?:\/\/[^\s]+/g, (match) => {
        const placeholder = `__LINK_${keyCounter}__`
        parts.push(
          <a 
            key={`link-${keyCounter}`} 
            href={match} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {match}
          </a>
        )
        keyCounter++
        return placeholder
      })
      
      // Replace bold text
      currentText = currentText.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
        const placeholder = `__BOLD_${keyCounter}__`
        parts.push(<strong key={`bold-${keyCounter}`} className="font-semibold">{p1}</strong>)
        keyCounter++
        return placeholder
      })
      
      // Replace italic text
      currentText = currentText.replace(/_([^_]+)_/g, (match, p1) => {
        const placeholder = `__ITALIC_${keyCounter}__`
        parts.push(<em key={`italic-${keyCounter}`} className="italic text-gray-600">{p1}</em>)
        keyCounter++
        return placeholder
      })
      
      // Split the text and insert formatted parts
      const segments = currentText.split(/__(?:BOLD|ITALIC|LINK)_\d+__/)
      const result: React.ReactNode[] = []
      let partIndex = 0
      
      segments.forEach((segment, i) => {
        if (segment) result.push(segment)
        if (i < segments.length - 1 && parts[partIndex]) {
          result.push(parts[partIndex])
          partIndex++
        }
      })
      
      return (
        <span key={lineIndex}>
          {result.length > 0 ? result : line}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      )
    })
  }
  
  return <div className="whitespace-pre-wrap break-words">{parseMarkdown(content)}</div>
}