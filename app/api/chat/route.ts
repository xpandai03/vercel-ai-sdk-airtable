import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { airtableTools } from '@/lib/airtable-tools'
import { createAirtableInterceptor } from '@/lib/stream-interceptor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SYSTEM_PROMPT = `You are an AI assistant that helps users interact with their Airtable data.

You have access to the Master Video Log database which contains these tables:
- Master Archive: Main patient records with procedures and treatments
- BAs for Approval: Records pending approval
- Master Content List: Content tracking and management
- IG Lives: Instagram Live content
- Snapchat: Snapchat content
- PT STORIES: Post-treatment stories
- Patient Stories: Patient treatment narratives
- Post Treatment Stories: Follow-up stories after treatment

When users ask about their Airtable data, include these exact markers in your response:
- {{TABLES}} - To list all available tables
- {{SEARCH:tableName:10}} - To browse records from a table (no search term)
- {{QUERY:tableName:searchTerm:10}} - To search for specific records
- {{COUNT:tableName}} - To count records in a table

IMPORTANT: For natural language queries, use the QUERY marker:
- "Find patient Bastien" → {{QUERY:Master Archive:Bastien:10}}
- "Search for Verma" → {{QUERY:Master Archive:Verma:10}}
- "Show me acne scar treatments" → {{QUERY:Master Archive:acne scars:10}}
- "Find records for Anjalina" → {{QUERY:Master Archive:Anjalina:10}}
- "Search patient stories for recovery" → {{QUERY:Patient Stories:recovery:10}}

When searching for patients, ALWAYS search in Master Archive first as it contains the main patient records.

Examples:
- User: "What tables are available?"
  You: "Let me show you all available tables in your database... {{TABLES}}"
  
- User: "Find patient Bastien"
  You: "I'll search for patient Bastien in the records... {{QUERY:Master Archive:Bastien:10}}"
  
- User: "Show me Verma's treatment"
  You: "Let me find Verma's treatment records... {{QUERY:Master Archive:Verma:10}}"
  
- User: "How many records are in Patient Stories?"
  You: "Let me count the records in Patient Stories... {{COUNT:Patient Stories}}"

Always provide helpful context before and after showing the data.`

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