'use client'

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useAirtableChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: input.trim()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)
    
    const assistantMessage: Message = {
      id: nanoid(),
      role: 'assistant',
      content: ''
    }
    
    setMessages(prev => [...prev, assistantMessage])
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response body')
      }
      
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          // Process any remaining buffer
          if (buffer) {
            setMessages(prev => {
              const newMessages = [...prev]
              const lastMessage = newMessages[newMessages.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = buffer
              }
              return newMessages
            })
          }
          break
        }
        
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Update the assistant message with the accumulated buffer
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = buffer
          }
          return newMessages
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError(err as Error)
      
      // Show error in the assistant message
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = `Error: ${(err as Error).message}`
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, isLoading])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error
  }
}