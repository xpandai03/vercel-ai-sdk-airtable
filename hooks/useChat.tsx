"use client"

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function useChat({ api }: { api: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: input.trim()
    }
    
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Sending request to:', api, 'with messages:', newMessages)
      
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages
        }),
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let assistantMessage: Message = {
        id: nanoid(),
        role: 'assistant',
        content: ''
      }
      
      setMessages([...newMessages, assistantMessage])
      
      if (reader) {
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          console.log('Received chunk:', chunk)
          
          // The response is plain text from toTextStreamResponse()
          // Just append it directly to the assistant message
          if (chunk) {
            assistantMessage.content += chunk
            setMessages(prev => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = { ...assistantMessage }
              return newMessages
            })
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, api])
  
  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  }
}