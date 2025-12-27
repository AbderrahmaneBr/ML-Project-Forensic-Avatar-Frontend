# Frontend - AI Forensic Avatar

React frontend for the AI Forensic Avatar application. Features a 3D detective avatar with lip-sync, text-to-speech, and real-time streaming chat interface.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Three.js / React Three Fiber** - 3D avatar rendering
- **Radix UI** - Accessible UI components
- **Web Speech API** - Text-to-speech

## Features

- 3D animated detective avatar with lip-sync
- Real-time streaming AI responses (SSE)
- Text-to-speech narration with natural voices
- Image upload for forensic analysis
- Conversation history management
- Dark themed detective aesthetic
- Responsive design

## Project Structure

```
frontend/
├── public/
│   ├── images/          # Background images
│   └── models/          # 3D avatar .glb files
├── src/
│   ├── components/
│   │   ├── ui/          # Reusable UI components
│   │   ├── ChatInterface.tsx    # Main chat UI
│   │   ├── DetectiveAvatar.tsx  # 3D avatar with lighting
│   │   ├── ImageUpload.tsx      # Drag-drop image upload
│   │   ├── MessageList.tsx      # Chat message display
│   │   ├── Sidebar.tsx          # Conversation list
│   │   └── StreamingMessage.tsx # Streaming text display
│   ├── hooks/
│   │   └── useTextToSpeech.ts   # TTS hook
│   ├── lib/
│   │   ├── api.ts       # API client functions
│   │   └── utils.ts     # Utility functions
│   ├── types/
│   │   └── index.ts     # TypeScript interfaces
│   ├── App.tsx          # Root component
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry point
├── Dockerfile           # Production container
├── nginx.conf           # Nginx configuration
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Avatar Setup

Place your 3D avatar model in `public/models/avatar.glb`. The component supports:

- Ready Player Me avatars
- VRoid models
- Any GLB with morph targets for lip-sync

Supported morph target naming conventions:

- RPM visemes (`viseme_aa`, `viseme_E`, etc.)
- ARKit blend shapes (`jawOpen`, `mouthOpen`, etc.)
- VRoid naming (`Fcl_MTH_A`, `Fcl_MTH_O`, etc.)

Background image goes in `public/images/background.jpg`.

## Environment Variables

Create a `.env` file for local development:

```env
VITE_API_URL=http://localhost:8000
```

## Local Development

### Prerequisites

- Node.js 20+
- Backend API running

### Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Docker

Build and run with Docker Compose from the project root:

```bash
docker-compose up --build frontend
```

The app will be available at `http://localhost:3000`

## Lighting Configuration

The 3D avatar uses multiple light sources for a detective noir aesthetic:

| Light          | Color     | Purpose                   |
| -------------- | --------- | ------------------------- |
| Ambient        | `#ffecd2` | Warm base glow            |
| Key Light      | `#ffb366` | Main desk lamp feel       |
| Fill Light     | `#ffd699` | Secondary warm fill       |
| Rim Light      | `#cc9933` | Golden backlight          |
| Face Fill      | `#fff5e6` | Soft front light          |
| Blue Rim       | `#4a90d9` | Side accent lights        |
| Green Rim      | `#3dd68c` | Lower side accents        |
| Yellow Uplight | `#ffd700` | Under-face dramatic light |

Adjust intensities in `DetectiveAvatar.tsx` to customize the look.
