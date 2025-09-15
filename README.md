# Vercel AI SDK + Airtable Chat Interface

A Next.js chat application that integrates with Airtable databases using the Vercel AI SDK.

## Features

- 🤖 AI-powered chat interface
- 📊 Direct Airtable integration
- 💬 Real-time streaming responses
- 📝 Markdown formatting support
- 🔍 Query and search Airtable records
- 📈 Count and list database tables

## Tech Stack

- **Next.js 14.2.16** - React framework
- **Vercel AI SDK** - AI streaming and chat functionality
- **Airtable API** - Database integration
- **OpenAI GPT-4** - Language model
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Environment Variables

Create a `.env.local` file with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
```

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/xpandai03/vercel-ai-sdk-airtable.git
cd vercel-ai-sdk-airtable
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see above)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Available Commands

The AI assistant can interact with your Airtable database using these commands:
- List all available tables
- Search for records in any table
- Count records in tables
- Retrieve specific records

## Deployment

This app is optimized for deployment on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xpandai03/vercel-ai-sdk-airtable)

## License

MIT