import { 
  getTablesList, 
  searchTable, 
  searchTableWithQuery,
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
  
  // Process {{QUERY:tableName:searchTerm:count}} markers for natural language search
  const queryPattern = /\{\{QUERY:([^:]+):([^:]+):(\d+)\}\}/g
  const queryMatches = [...processedText.matchAll(queryPattern)]
  
  for (const match of queryMatches) {
    const [fullMatch, tableName, searchTerm, countStr] = match
    const maxRecords = parseInt(countStr, 10)
    
    try {
      console.log(`Processing query for "${searchTerm}" in table: ${tableName}, max: ${maxRecords}`)
      const result = await searchTableWithQuery(tableName.trim(), searchTerm.trim(), maxRecords)
      const formatted = formatRecordsForChat(result.records)
      processedText = processedText.replace(fullMatch, formatted)
      console.log(`Replaced ${fullMatch} with ${result.count} records`)
    } catch (error) {
      console.error(`Error processing ${fullMatch}:`, error)
      processedText = processedText.replace(fullMatch, `[Error searching ${tableName}]`)
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
          
          // Check if we have an incomplete marker
          const hasOpenMarker = buffer.includes('{{') && 
            buffer.lastIndexOf('{{') > buffer.lastIndexOf('}}')
          
          // If we have complete markers, process them
          const hasCompleteMarker = 
            (buffer.includes('{{TABLES}}')) ||
            (buffer.includes('{{SEARCH:') && buffer.includes('}}')) ||
            (buffer.includes('{{QUERY:') && buffer.includes('}}')) ||
            (buffer.includes('{{COUNT:') && buffer.includes('}}'))
          
          if (hasCompleteMarker) {
            // Process all complete markers in the buffer
            const processed = await processAirtableMarkers(buffer)
            buffer = ''
            controller.enqueue(encoder.encode(processed))
          } else if (!hasOpenMarker && buffer.length > 0) {
            // No markers in progress, stream immediately
            controller.enqueue(encoder.encode(buffer))
            buffer = ''
          } else if (hasOpenMarker && buffer.length > 1000) {
            // Buffer getting too large with open marker, release content before marker
            const openMarkerIndex = buffer.lastIndexOf('{{')
            if (openMarkerIndex > 0) {
              const toRelease = buffer.substring(0, openMarkerIndex)
              buffer = buffer.substring(openMarkerIndex)
              controller.enqueue(encoder.encode(toRelease))
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