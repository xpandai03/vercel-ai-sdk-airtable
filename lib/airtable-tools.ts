import Airtable from 'airtable'
import { z } from 'zod'
import { tool } from 'ai'

// Configure Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY!
}).base(process.env.AIRTABLE_BASE_ID!)

// Tool to list all tables
export const listTables = tool({
  description: 'List all available tables in the Airtable database',
  parameters: z.object({
    trigger: z.literal(true).describe('Always true to trigger the function')
  }),
  execute: async ({ trigger }) => {
    const tables = [
      'Master Archive',
      'Patient Stories', 
      'IG Lives',
      'Snapchat',
      'PT Stories'
    ]
    return {
      tables,
      message: `Available tables: ${tables.join(', ')}`
    }
  }
})

// Tool to search records
export const searchRecords = tool({
  description: 'Search for records in a specific Airtable table',
  parameters: z.object({
    tableName: z.string().describe('Name of the table to search'),
    query: z.string().optional().describe('Search query to filter records'),
    maxRecords: z.number().default(10).describe('Maximum number of records to return')
  }),
  execute: async ({ tableName, query, maxRecords }) => {
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
        tableName,
        recordCount: results.length,
        records: results,
        message: `Found ${results.length} records in ${tableName}`
      }
    } catch (error) {
      return {
        error: true,
        message: `Error accessing ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// Tool to get specific record
export const getRecord = tool({
  description: 'Get a specific record by ID from an Airtable table',
  parameters: z.object({
    tableName: z.string().describe('Name of the table'),
    recordId: z.string().describe('ID of the record to retrieve')
  }),
  execute: async ({ tableName, recordId }) => {
    try {
      const record = await base(tableName).find(recordId)
      return {
        id: record.id,
        fields: record.fields,
        message: `Retrieved record ${recordId} from ${tableName}`
      }
    } catch (error) {
      return {
        error: true,
        message: `Error retrieving record: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

// Tool to count records
export const countRecords = tool({
  description: 'Count the total number of records in a table',
  parameters: z.object({
    tableName: z.string().describe('Name of the table')
  }),
  execute: async ({ tableName }) => {
    try {
      let count = 0
      await base(tableName).select({
        fields: [],
        pageSize: 100
      }).eachPage((records, fetchNextPage) => {
        count += records.length
        fetchNextPage()
      })
      
      return {
        tableName,
        count,
        message: `${tableName} contains ${count} records`
      }
    } catch (error) {
      return {
        error: true,
        message: `Error counting records: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
})

export const airtableTools = {
  listTables,
  searchRecords,
  getRecord,
  countRecords
}