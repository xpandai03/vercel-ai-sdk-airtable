import Airtable from 'airtable'

// Configure Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!
}).base(process.env.AIRTABLE_BASE_ID!)

// Simple function to get list of tables
export async function getTablesList(): Promise<string[]> {
  return [
    'Master Archive',
    'BAs for Approval',
    'Master Content List',
    'IG Lives',
    'Snapchat',
    'PT STORIES',
    'Patient Stories',
    'Post Treatment Stories'
  ]
}

// Simple function to search a table (no query - just get records)
export async function searchTable(
  tableName: string,
  maxRecords: number = 10
): Promise<{ count: number; records: any[] }> {
  try {
    const records = await base(tableName).select({
      maxRecords,
      view: "Grid view"
    }).firstPage()
    
    const results = records.map(record => ({
      id: record.id,
      fields: record.fields
    }))
    
    return {
      count: results.length,
      records: results
    }
  } catch (error) {
    console.error(`Error searching ${tableName}:`, error)
    return {
      count: 0,
      records: []
    }
  }
}

// Advanced search function with query support
export async function searchTableWithQuery(
  tableName: string,
  query: string,
  maxRecords: number = 10
): Promise<{ count: number; records: any[] }> {
  try {
    // First, let's do a simple search without formula to inspect field names
    if (!query) {
      return searchTable(tableName, maxRecords)
    }
    
    // Always use client-side filtering for reliable results
    // This handles all name formats and field variations
    const allRecords = await base(tableName).select({
      maxRecords: 200,  // Get more records to search through
      view: "Grid view"
    }).firstPage()
    
    // Log field names from first record for debugging
    if (allRecords.length > 0) {
      const fieldNames = Object.keys(allRecords[0].fields)
      console.log(`Available fields in ${tableName}:`, fieldNames)
    }
    
    // Normalize the search query and handle name variations
    const searchLower = query.toLowerCase().trim()
    
    // Create variations of the search term for names
    // E.g., "Luis Quan" -> ["luis quan", "quan, luis", "quan luis"]
    const searchVariations = [searchLower]
    
    // If it looks like a name (has a space), create variations
    if (searchLower.includes(' ')) {
      const parts = searchLower.split(' ')
      if (parts.length === 2) {
        // Add "Last, First" format
        searchVariations.push(`${parts[1]}, ${parts[0]}`)
        // Add "Last First" format
        searchVariations.push(`${parts[1]} ${parts[0]}`)
      }
    }
    
    // Filter records client-side with all variations
    const filteredRecords = allRecords.filter(record => {
      const fieldsStr = JSON.stringify(record.fields).toLowerCase()
      return searchVariations.some(variation => fieldsStr.includes(variation))
    }).slice(0, maxRecords)
    
    const results = filteredRecords.map(record => ({
      id: record.id,
      fields: record.fields
    }))
    
    console.log(`Found ${results.length} records matching "${query}" in ${tableName}`)
    console.log(`Search variations used:`, searchVariations)
    
    return {
      count: results.length,
      records: results
    }
  } catch (error) {
    console.error(`Error searching ${tableName} with query "${query}":`, error)
    return {
      count: 0,
      records: []
    }
  }
}

// Simple function to count records in a table
export async function countTableRecords(tableName: string): Promise<number> {
  try {
    let count = 0
    await base(tableName).select({
      fields: [],
      pageSize: 100
    }).eachPage((records, fetchNextPage) => {
      count += records.length
      fetchNextPage()
    })
    return count
  } catch (error) {
    console.error(`Error counting ${tableName}:`, error)
    return 0
  }
}

// Format records for display in chat with markdown
export function formatRecordsForChat(records: any[]): string {
  if (records.length === 0) {
    return "_No records found._"
  }
  
  return '\n\n' + records.map((record, index) => {
    // Show ALL fields, not just first 3
    const fields = Object.entries(record.fields)
      .filter(([_, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => {
        // Format value based on type
        let displayValue = value
        if (Array.isArray(value)) {
          displayValue = value.join(', ')
        } else if (typeof value === 'object') {
          displayValue = JSON.stringify(value)
        }
        return `   **${key}:** ${displayValue}`
      })
      .join('\n')
    
    // Add record ID for reference
    return `**Record ${index + 1}** (ID: ${record.id.substring(0, 8)}...)\n${fields}`
  }).join('\n\n---\n\n') + '\n\n'
}