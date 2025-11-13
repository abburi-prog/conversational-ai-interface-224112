# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify
- **Streaming Chat**: Streams tokens from FastAPI backend and renders progressively with a typing indicator
- **Voice Support**: Optional microphone (speech-to-text) and speaker (text-to-speech) powered by browser Web Speech APIs

## Getting Started

1) Copy `.env.example` to `.env` and set:
   - `REACT_APP_API_BASE=http://localhost:3001` (backend base URL)
   - Optional voice feature flags:
     - `REACT_APP_VOICE_ENABLED=true` (default true)
     - `REACT_APP_TTS_AUTO_SPEAK=true` (auto speak AI responses; default true)
2) Install dependencies:
   - `npm install`
3) Run the app:
   - `npm start`
4) Open [http://localhost:3000](http://localhost:3000)

## Voice Features

This app uses native browser Web Speech APIs:
- Speech-to-Text: `webkitSpeechRecognition` (Chrome/Edge) with interim results and mic start/stop
- Text-to-Speech: `window.speechSynthesis` with selectable voice, play/pause/stop, and automatic speaking of AI replies

Graceful fallback:
- If STT is unsupported, mic button shows a tooltip explaining unavailability.
- If TTS is unsupported, speaker controls are disabled with a note.

Accessibility:
- Buttons include `aria-label`, `aria-pressed`, and status text for screen readers.
- Errors are presented inline and do not break chat.

Security/Privacy:
- No audio leaves the browser; transcription is performed locally by the browser engine when supported.
- Backend API usage remains unchanged.

## How streaming works

The UI prefers the streaming endpoint `POST /api/chat/stream` and renders tokens as they arrive using the Fetch ReadableStream API. If the browser does not support streaming or the request fails, it gracefully falls back to the non‑streaming `POST /api/chat`.

No secrets are stored in frontend. Do not put API keys into `REACT_APP_*` variables.

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
