import { 
  getTablesList, 
  searchTable, 
  countTableRecords,
  formatRecordsForChat 
} from './airtable-simple'

// Process markers in a text chunk
export async function processAirtableMarkers(text: string): Promise<string> {
  let processedText = text
  
  // Process {{TABLES}} marker
  if (processedText.includes('{{TABLES}}')) {
    try {
      const tables = await getTablesList()
      const tablesList = '\n\n' + tables.map((table, index) => 
        `${index + 1}. **${table}**`
      ).join('\n') + '\n\n'
      processedText = processedText.replace('{{TABLES}}', tablesList)
      console.log('Replaced {{TABLES}} marker with formatted list')
    } catch (error) {
      console.error('Error processing {{TABLES}}:', error)
      processedText = processedText.replace('{{TABLES}}', '[Error loading tables]')
    }
  }
  
  // Process {{SEARCH:tableName:count}} markers
  const searchPattern = /\{\{SEARCH:([^:]+):(\d+)\}\}/g
  const searchMatches = [...processedText.matchAll(searchPattern)]
  
  for (const match of searchMatches) {
    const [fullMatch, tableName, countStr] = match
    const maxRecords = parseInt(countStr, 10)
    
    try {
      console.log(`Processing search for table: ${tableName}, max: ${maxRecords}`)
      const result = await searchTable(tableName.trim(), maxRecords)
      const formatted = formatRecordsForChat(result.records)
      processedText = processedText.replace(fullMatch, formatted)
      console.log(`Replaced ${fullMatch} with ${result.count} records`)
    } catch (error) {
      console.error(`Error processing ${fullMatch}:`, error)
      processedText = processedText.replace(fullMatch, `[Error searching ${tableName}]`)
    }
  }
  
  // Process {{COUNT:tableName}} markers
  const countPattern = /\{\{COUNT:([^}]+)\}\}/g
  const countMatches = [...processedText.matchAll(countPattern)]
  
  for (const match of countMatches) {
    const [fullMatch, tableName] = match
    
    try {
      console.log(`Processing count for table: ${tableName}`)
      const count = await countTableRecords(tableName.trim())
      processedText = processedText.replace(fullMatch, count.toString())
      console.log(`Replaced ${fullMatch} with count: ${count}`)
    } catch (error) {
      console.error(`Error processing ${fullMatch}:`, error)
      processedText = processedText.replace(fullMatch, `[Error counting ${tableName}]`)
    }
  }
  
  return processedText
}

// Create a transform stream that intercepts and processes markers
export function createAirtableInterceptor(originalStream: ReadableStream): ReadableStream {
  const reader = originalStream.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  
  // Buffer to accumulate text until we have complete markers
  let buffer = ''
  
  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            // Process any remaining buffer
            if (buffer) {
              const processed = await processAirtableMarkers(buffer)
              controller.enqueue(encoder.encode(processed))
            }
            controller.close()
            break
          }
          
          // Decode the chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          
          // Check if we have complete markers to process
          // We'll process when we have a complete marker or enough text
          const hasCompleteMarker = 
            (buffer.includes('{{TABLES}}') && buffer.indexOf('{{TABLES}}') + 10 <= buffer.length) ||
            (buffer.includes('{{SEARCH:') && buffer.includes('}}')) ||
            (buffer.includes('{{COUNT:') && buffer.includes('}}'))
          
          // Process if we have complete markers or buffer is getting large
          if (hasCompleteMarker || buffer.length > 500) {
            // Find a safe split point (not in the middle of a marker)
            let splitPoint = buffer.length
            
            // If buffer is large, try to find a safe split point
            if (buffer.length > 500) {
              // Look for last complete sentence or space before any open marker
              const openMarkerIndex = buffer.lastIndexOf('{{')
              if (openMarkerIndex > 0 && !buffer.substring(openMarkerIndex).includes('}}')) {
                splitPoint = openMarkerIndex
              }
            }
            
            // Process the safe portion
            const toProcess = buffer.substring(0, splitPoint)
            buffer = buffer.substring(splitPoint)
            
            if (toProcess) {
              const processed = await processAirtableMarkers(toProcess)
              controller.enqueue(encoder.encode(processed))
            }
          }
        }
      } catch (error) {
        console.error('Error in stream interceptor:', error)
        controller.error(error)
      }
    }
  })
}