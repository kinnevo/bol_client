import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Generate a unique window session ID (allows multiple windows, one active tab per window)
const getWindowSessionId = () => {
  let windowId = sessionStorage.getItem('windowId');
  if (!windowId) {
    windowId = 'window_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('windowId', windowId);
  }
  
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('tabId', tabId);
  }
  
  return `${windowId}_${tabId}`;
};

const WINDOW_SESSION_ID = getWindowSessionId();

// Create socket with window session ID
const createSocket = () => {
  console.log('🔌 Creating socket for window session:', WINDOW_SESSION_ID);
  
  // Determine server URL based on environment
  const SERVER_URL = process.env.REACT_APP_SERVER_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://bolrailway-production.up.railway.app' 
      : 'http://localhost:3001');
  
  console.log('🌐 Connecting to server:', SERVER_URL);
  
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    upgrade: true,
    rememberUpgrade: true,
    autoConnect: true,
    query: {
      browserSessionId: WINDOW_SESSION_ID
    }
  });

  socket.on('connect', () => {
    console.log('🟢 Socket connected:', socket.id, 'Window Session:', WINDOW_SESSION_ID);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  // Handle server session for restart detection
  socket.on('server-session', (data) => {
    const lastServerSession = localStorage.getItem('serverSessionId');

    // If this is a reconnection, don't redirect
    if (data.reconnected) {
      console.log('✅ Reconnected to existing session');
      localStorage.setItem('serverSessionId', data.sessionId);

      // Store bot availability configuration
      if (data.botsAvailable !== undefined) {
        localStorage.setItem('botsAvailable', data.botsAvailable.toString());
        console.log(`🤖 Bot players are ${data.botsAvailable ? 'ENABLED' : 'DISABLED'} on this server`);
      }
      return;
    }

    // Server restart detected - but session might be restored from Redis
    if (lastServerSession && lastServerSession !== data.sessionId) {
      console.log('🔄 Server restart detected');

      // Don't clear data immediately - wait to see if we get a reconnection event
      localStorage.setItem('serverSessionId', data.sessionId);

      // Give the server a moment to send reconnection data
      setTimeout(() => {
        // If we haven't been reconnected to a room, we can clear state
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/game/') && !currentPath.startsWith('/lobby')) {
          console.log('No session restored, clearing local data');
          localStorage.removeItem('playerName');
          localStorage.removeItem('currentRoom');
        }
      }, 1000);

      return;
    }

    localStorage.setItem('serverSessionId', data.sessionId);

    // Store bot availability configuration
    if (data.botsAvailable !== undefined) {
      localStorage.setItem('botsAvailable', data.botsAvailable.toString());
      console.log(`🤖 Bot players are ${data.botsAvailable ? 'ENABLED' : 'DISABLED'} on this server`);
    }
  });

  // Handle successful reconnection to existing session
  socket.on('reconnected', (data) => {
    console.log('🎉 Successfully reconnected to session:', data);

    // Update local storage with session data
    if (data.playerName) {
      localStorage.setItem('playerName', data.playerName);
      sessionStorage.setItem('playerName', data.playerName);
    }

    if (data.room) {
      localStorage.setItem('currentRoom', JSON.stringify({
        id: data.room.id,
        name: data.room.name,
        isHost: data.room.hostId === data.playerId
      }));

      // Redirect to game page if not already there
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/game/')) {
        console.log('Redirecting to game room:', data.room.id);
        window.location.href = `/game/${data.room.id}`;
      } else {
        // Already on game page, dispatch event to update state
        window.dispatchEvent(new CustomEvent('session-restored', {
          detail: {
            room: data.room,
            playerName: data.playerName,
            playerId: data.playerId
          }
        }));
      }
    }
  });

  // Handle server reset
  socket.on('server-reset', (data) => {
    console.log('🔄 Server reset detected:', data.message);
    
    // Clear all local storage and session storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Disconnect the socket
    socket.disconnect();
    window.appSocket = null;
    
    // Redirect to login with reset message
    setTimeout(() => {
      window.location.href = '/?reset=true';
    }, 500);
  });

  return socket;
};

// Single socket instance
let globalSocket = null;

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create socket only once
    if (!globalSocket) {
      globalSocket = createSocket();
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleError = (err) => setError(err.message);

    globalSocket.on('connect', handleConnect);
    globalSocket.on('disconnect', handleDisconnect);
    globalSocket.on('connect_error', handleError);

    // Set initial state
    setIsConnected(globalSocket.connected);

    // Cleanup - remove listeners but keep socket alive
    return () => {
      if (globalSocket) {
        globalSocket.off('connect', handleConnect);
        globalSocket.off('disconnect', handleDisconnect);
        globalSocket.off('connect_error', handleError);
      }
    };
  }, []);

  const emit = (event, data, callback) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit(event, data, callback);
    } else {
      console.warn('⚠️ Socket not connected. Cannot emit event:', event);
    }
  };

  const on = (event, handler) => {
    if (globalSocket) {
      globalSocket.on(event, handler);
    }
  };

  const off = (event, handler) => {
    if (globalSocket) {
      globalSocket.off(event, handler);
    }
  };

  const reconnect = () => {
    if (globalSocket && !globalSocket.disconnected) {
      globalSocket.disconnect();
      globalSocket.connect();
    }
  };

  const disconnect = () => {
    if (globalSocket) {
      console.log('🔴 Permanently disconnecting socket');
      try {
        globalSocket.disconnect();
      } catch (error) {
        console.warn('Error disconnecting socket:', error);
      }
      globalSocket = null;
      sessionStorage.removeItem('windowId');
      sessionStorage.removeItem('tabId');
      setIsConnected(false);
    }
  };

  return {
    socket: globalSocket,
    isConnected,
    error,
    emit,
    on,
    off,
    reconnect,
    disconnect,
    windowSessionId: WINDOW_SESSION_ID
  };
};

export default useSocket;