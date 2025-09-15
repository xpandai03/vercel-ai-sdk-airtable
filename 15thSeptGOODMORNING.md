# Vercel AI + Airtable Integration Context - September 15, 2025

## Current Status
- **Working**: Basic chat interface with OpenAI responses streaming properly
- **Partially Working**: Airtable tool integration (disabled due to schema validation errors)
- **Connected**: Airtable API connection verified and working

## Project Structure
```
vercel-ai-chat-interface/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts         # Main API endpoint for chat
│   └── page.tsx                 # Chat UI component
├── hooks/
│   └── useAirtableChat.tsx      # Custom hook for plain text streaming
├── lib/
│   └── airtable-tools.ts        # Airtable tool definitions (has schema issues)
└── .env.local                   # Environment variables
```

## Key Files

### /app/api/chat/route.ts
- Main API endpoint handling chat requests
- Currently using OpenAI's gpt-4o-mini model
- Tools temporarily disabled due to schema validation errors
- Returns plain text streaming responses

### /hooks/useAirtableChat.tsx
- Custom React hook for handling chat functionality
- Properly handles plain text streaming (not DataStream format)
- Fixed word duplication issue by replacing content instead of appending

### /lib/airtable-tools.ts
- Defines 4 tools: listTables, searchRecords, getRecord, countRecords
- **Issue**: Empty parameters cause schema validation errors with OpenAI
- Tools are currently commented out in route.ts

## Environment Variables (.env.local)
```
OPENAI_API_KEY=sk-proj-LZdffA9ujKH...
AIRTABLE_API_KEY=patBS6fNYjpIVYvvX...
AIRTABLE_BASE_ID=appckWg7RH2419fYA
AZURE_OPENAI_API_KEY=2rQ3uyqq... (not currently used)
AZURE_OPENAI_ENDPOINT=https://azure-openai-instance-xpand.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

## Working Features
1. Chat interface sends and displays messages
2. OpenAI streaming responses work correctly
3. Airtable connection verified (can read tables and records)
4. Custom useAirtableChat hook handles plain text streaming

## Known Issues
1. **Tool Schema Validation**: OpenAI rejects tools with empty parameters
   - Error: "Invalid schema for function 'listTables': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'"
   - Attempted fix with dummy parameter didn't resolve the issue
   - Tools are temporarily disabled to allow basic chat to work

## Airtable Database Structure
Available tables in Master Video Log:
- Master Archive (main content archive)
- Patient Stories (patient treatment stories)
- IG Lives (Instagram live content)
- Snapchat (Snapchat content)
- PT Stories (PT stories content)
- Master Content List (content tracking)

## How to Run
```bash
# In the vercel-ai-chat-interface directory
npm run dev
# Server runs on http://localhost:3000
```

## Recent Fixes Applied
1. ✅ Fixed streaming response display using correct `toTextStreamResponse()` method
2. ✅ Created custom useAirtableChat hook for plain text streaming
3. ✅ Fixed word duplication by replacing content instead of appending in buffer
4. ✅ Switched from Azure to OpenAI API when Azure had issues
5. ✅ Verified Airtable connection works with test script
6. ⚠️ Attempted to add Airtable tools but schema validation prevents usage

## Next Steps to Enable Airtable Tools
1. Fix the schema validation issue for tools with no required parameters
2. Re-enable tools in route.ts once schema is fixed
3. Test tool calling with actual Airtable queries
4. Implement proper error handling for tool failures

## Testing Commands
```bash
# Test Airtable connection (already verified working)
node test-airtable-connection.js

# Run the development server
npm run dev
```

## Important Notes
- Always use `toTextStreamResponse()` for streaming, not non-existent methods
- The custom useAirtableChat hook expects plain text, not DataStream format
- Buffer content should be replaced, not appended, to avoid word duplication
- OpenAI function calling requires proper JSON schema even for empty parameters