import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { airtableTools } from '@/lib/airtable-tools'
import { createAirtableInterceptor } from '@/lib/stream-interceptor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SYSTEM_PROMPT = `You are an AI assistant that helps users interact with their Airtable data.

You have access to the Master Video Log database which contains:
- Master Archive: Main content archive
- Patient Stories: Patient treatment stories  
- IG Lives, Snapchat, PT Stories: Social media content
- Master Content List: Content tracking

When users ask about their Airtable data, include these exact markers in your response where you want the data to appear:
- {{TABLES}} - To list all available tables
- {{SEARCH:tableName:10}} - To search a specific table (replace tableName with actual table name, 10 is max records)
- {{COUNT:tableName}} - To count records in a table (replace tableName with actual table name)

Examples:
- User: "What tables do I have?"
  You: "Let me check your available tables... {{TABLES}}"
  
- User: "Show me records from Master Archive"
  You: "I'll search the Master Archive table for you... {{SEARCH:Master Archive:10}}"
  
- User: "How many patient stories are there?"
  You: "Let me count the records in Patient Stories... {{COUNT:Patient Stories}}"

Always provide context before and after the markers to make the response natural.`

export async function POST(req: Request) {
  try {
    const { messages } = await req.json()
    
    console.log('Chat request received:', {
      messageCount: messages?.length || 0,
      firstMessage: messages?.[0]
    })
    
    // Use OpenAI with tools
    try {
      const result = streamText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        messages: messages ?? [],
        // tools: airtableTools,
        // maxSteps: 5, // Allow multiple tool calls
      })
      
      console.log('Streaming OpenAI response...')
      
      // Get the original stream
      const originalResponse = result.toTextStreamResponse()
      const originalStream = originalResponse.body
      
      if (!originalStream) {
        throw new Error('No stream available')
      }
      
      // Wrap the stream with our interceptor
      const interceptedStream = createAirtableInterceptor(originalStream)
      
      // Return the intercepted stream
      return new Response(interceptedStream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        }
      })
    } catch (openaiError) {
      console.error('OpenAI error, using mock response:', openaiError)
      
      // Fall back to mock response
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          const mockResponse = "Hello! I'm your Airtable assistant. I can help you interact with your Master Video Log database. What would you like to know about your data?"
          
          // Simulate streaming by sending chunks
          const words = mockResponse.split(' ')
          for (const word of words) {
            controller.enqueue(encoder.encode(word + ' '))
            await new Promise(resolve => setTimeout(resolve, 50))
          }
          controller.close()
        }
      })
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        }
      })
    }
    
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Return error in the expected format for useChat
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}