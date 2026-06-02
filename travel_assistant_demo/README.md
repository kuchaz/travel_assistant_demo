# Travel Assistant Demo

This is a complete HTML + JS + Node demo for a conversational travel assistant.

## What it does

- Generates a simple itinerary from destination, days, budget, and interests
- Keeps the displayed itinerary and the chat context synchronized
- Uses a Node backend route to call DeepSeek
- Falls back to a local demo response if the DeepSeek API key is missing or the API call fails

## Files

- `server.js` - Node + Express backend
- `public/index.html` - front-end page
- `public/style.css` - styles
- `public/app.js` - front-end logic
- `.env.example` - example environment variables

## Run steps

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env`.
4. Put your real DeepSeek API key into `.env`:

```bash
DEEPSEEK_API_KEY=your_real_key_here
PORT=3001
```

5. Start the server:

```bash
npm start
```

6. Open this address in your browser:

```bash
http://localhost:3001
```

## Notes

- If you do not provide a DeepSeek API key, the page still works in local fallback mode.
- The AI status badge at the top shows whether DeepSeek is connected.
- Do not put the API key in the front-end JavaScript file.
