import Airtable from 'airtable'

// Configure Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!
}).base(process.env.AIRTABLE_BASE_ID!)

// Simple function to get list of tables
export async function getTablesList(): Promise<string[]> {
  return [
    'Master Archive',
    'Patient Stories',
    'IG Lives',
    'Snapchat',
    'PT Stories',
    'Master Content List'
  ]
}

// Simple function to search a table
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
    const fields = Object.entries(record.fields)
      .slice(0, 3) // Show first 3 fields only
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n   ')
    return `${index + 1}. ${fields}`
  }).join('\n\n') + '\n\n'
}