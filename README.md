# BOL Game Client

React frontend for the BOL multiplayer game with real-time WebSocket communication.

## Features

- Real-time multiplayer game interface
- Individual ChatGPT conversations with AI life coach
- Progress tracking and room management
- Unique player and room name validation
- Session management with browser tab control
- PDF export functionality for conversation summaries

## Environment Setup

1. Copy the example environment file:
```bash
cp env.example .env
```

2. Configure the server URL in the `.env` file:
```
REACT_APP_SERVER_URL=http://localhost:3001
```

For production, update this to your deployed server URL.

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

This runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Build for Production

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Game Flow

1. **Login Page** (`/`) - Enter player name and room name
2. **Lobby Page** (`/lobby`) - Wait for other players to join
3. **Game Page** (`/game/:roomId`) - Individual AI conversations
4. **Reset Page** (`/reset`) - Admin functionality to reset server state

## Components

- `GameRoom.js` - Main game room component with player list and controls
- `PlayerList.js` - Display and manage connected players
- `RoomList.js` - Show available rooms

## Hooks

- `useSocket.js` - Custom hook for Socket.IO connection management

## Utilities

- `browserSession.js` - Browser session management and tab control

## Deployment

This client is configured for Railway deployment. The `railway.toml` file contains the deployment configuration.

Make sure to update the `REACT_APP_SERVER_URL` environment variable in your Railway deployment to point to your deployed server.
