import React, { useEffect, useState, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VoiceChat.css';

/**
 * VoiceChat Component
 * Manages Daily.co voice chat integration for the game
 * Uses createFrame with server-side enable_prejoin_ui: false for auto-join
 */
const VoiceChat = ({ roomUrl, playerName, meetingToken, onError, onMeetingEnded }) => {
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);

  // Use ref to track if we're currently cleaning up to prevent re-initialization
  const isCleaningUpRef = useRef(false);
  const frameRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Callback ref to detect when the container is mounted
  const setVideoContainerRef = (node) => {
    videoContainerRef.current = node;
    if (node && !containerReady) {
      setContainerReady(true);
    }
  };

  // Initialize Daily iframe
  useEffect(() => {
    if (!roomUrl) {
      console.log('[VoiceChat] No room URL provided');
      return;
    }

    // Wait for the container ref to be available
    if (!videoContainerRef.current) {
      console.log('[VoiceChat] Video container not ready yet');
      return;
    }

    // Prevent re-initialization if cleanup is in progress
    if (isCleaningUpRef.current) {
      console.log('[VoiceChat] Cleanup in progress, skipping initialization');
      return;
    }

    // Prevent duplicate frames
    if (frameRef.current) {
      console.log('[VoiceChat] Frame already exists, skipping');
      return;
    }

    console.log('[VoiceChat] Initializing Daily.co with room:', roomUrl);

    let isCancelled = false;

    const initializeDaily = async () => {
      // Check if we should still proceed
      if (isCancelled || !videoContainerRef.current) {
        console.log('[VoiceChat] Initialization cancelled or container gone');
        return;
      }

      // Create Daily iframe with matrix view (activeSpeakerMode: false)
      // Server-side enable_prejoin_ui: false will auto-join
      const frame = DailyIframe.createFrame(videoContainerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: false,
        activeSpeakerMode: false, // Use grid/matrix view by default
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '8px',
        },
      });

      if (isCancelled) {
        frame.destroy();
        return;
      }

      frameRef.current = frame;

      // Event handler for errors
      const handleError = (error) => {
        console.error('[VoiceChat] Daily error:', error);
        if (error.errorMsg === 'Meeting has ended') {
          console.log('[VoiceChat] Meeting ended gracefully');
          setMeetingEnded(true);
          if (onMeetingEnded) onMeetingEnded();
          return;
        }
        setError(error.errorMsg || 'Voice chat error');
        if (onError) onError(error);
      };

      // Set up event listeners
      frame.on('error', handleError);

      try {
        // Build join config
        const joinConfig = {
          url: roomUrl,
          startVideoOff: true,
          startAudioOff: false,
        };

        if (meetingToken) {
          joinConfig.token = meetingToken;
          console.log('[VoiceChat] Joining with meeting token');
        } else {
          joinConfig.userName = playerName;
          console.log('[VoiceChat] Joining with userName');
        }

        // Join the call - server-side enable_prejoin_ui: false handles auto-join
        await frame.join(joinConfig);
        console.log('[VoiceChat] Successfully joined room');

      } catch (err) {
        console.error('[VoiceChat] Error joining room:', err);
        if (!isCancelled) {
          setError('Failed to join voice chat');
          if (onError) onError(err);
        }
      }
    };

    initializeDaily();

    // Cleanup on unmount
    return () => {
      isCancelled = true;
      isCleaningUpRef.current = true;
      const currentFrame = frameRef.current;

      if (currentFrame) {
        console.log('[VoiceChat] Cleaning up frame');
        currentFrame.leave()
          .then(() => {
            currentFrame.destroy();
            console.log('[VoiceChat] Left and destroyed frame');
          })
          .catch((err) => {
            console.warn('[VoiceChat] Error during cleanup:', err);
            try {
              currentFrame.destroy();
            } catch (destroyErr) {
              console.warn('[VoiceChat] Error destroying frame:', destroyErr);
            }
          })
          .finally(() => {
            frameRef.current = null;
            isCleaningUpRef.current = false;
          });
      } else {
        isCleaningUpRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, playerName, meetingToken, containerReady]);

  if (error) {
    return (
      <div className="voice-chat-error">
        <p>Voice chat error: {error}</p>
      </div>
    );
  }

  if (meetingEnded) {
    return (
      <div className="voice-chat-container">
        <div className="voice-chat-ended">
          <div className="ended-icon">✨</div>
          <h3>Call Ended</h3>
          <p>Processing your conversation for AI insights...</p>
          <div className="processing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  if (!roomUrl) {
    return (
      <div className="voice-chat-container">
        <div className="voice-chat-header">
          <span className="voice-chat-title">
            🎙️ Voice Chat
          </span>
        </div>
        <div className="voice-chat-loading">
          <p>⏳ Setting up voice chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-chat-container">
      {/* Video container - Daily.co iframe will be embedded here */}
      <div className="video-container" ref={setVideoContainerRef}>
        {/* Daily.co iframe will be inserted here after joining */}
      </div>
    </div>
  );
};

export default VoiceChat;
