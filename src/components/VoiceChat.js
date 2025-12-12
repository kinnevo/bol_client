import React, { useEffect, useState, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VoiceChat.css';

/**
 * VoiceChat Component
 * Manages Daily.co voice chat integration for the game
 */
const VoiceChat = ({ roomUrl, playerName, meetingToken, onError }) => {
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);

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

  // Initialize Daily call frame
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

    console.log('[VoiceChat] Initializing Daily.co with room:', roomUrl);

    let isCancelled = false;

    const initializeDaily = async () => {
      // Prevent duplicate instances - destroy any existing frames first
      const existingFrame = DailyIframe.getCallInstance();
      if (existingFrame) {
        console.log('[VoiceChat] Destroying existing frame before creating new one');
        try {
          // Try to leave first, then destroy
          await existingFrame.leave().catch(() => {});
          await existingFrame.destroy();
          console.log('[VoiceChat] Existing frame destroyed successfully');
        } catch (err) {
          console.warn('[VoiceChat] Error destroying existing frame:', err);
        }
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if we should still proceed
      if (isCancelled || !videoContainerRef.current) {
        console.log('[VoiceChat] Initialization cancelled or container gone');
        return;
      }

      // Create Daily call frame - will be embedded in our video container
      const frame = DailyIframe.createFrame(videoContainerRef.current, {
        showLeaveButton: false,
        showFullscreenButton: false,
        activeSpeakerMode: false,  // Use grid/matrix view by default
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
        setError(error.errorMsg || 'Voice chat error');
        if (onError) onError(error);
      };

      // Set up error event listener
      frame.on('error', handleError);

      try {
        // Join the room with meeting token for proper participant ID mapping
        const joinConfig = {
          url: roomUrl,
        };

        // If we have a meeting token, use it (recommended for proper participant ID mapping)
        // Otherwise fall back to URL join with userName
        if (meetingToken) {
          joinConfig.token = meetingToken;
          console.log('[VoiceChat] Joining with meeting token for proper ID mapping');
        } else {
          joinConfig.userName = playerName;
          console.log('[VoiceChat] Joining with userName (no token available)');
        }

        await frame.join(joinConfig);

        if (isCancelled) return;

        console.log('[VoiceChat] Successfully joined room');

        // Enable microphone by default, keep video off
        if (frameRef.current) {
          frameRef.current.setLocalAudio(true);
          frameRef.current.setLocalVideo(false);
          console.log('[VoiceChat] Microphone enabled, video disabled by default');
        }
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
        console.log('[VoiceChat] Cleaning up call frame');
        currentFrame.leave()
          .then(() => {
            currentFrame.destroy();
            console.log('[VoiceChat] Left and destroyed call frame');
          })
          .catch((err) => {
            console.warn('[VoiceChat] Error during cleanup:', err);
            // Destroy anyway even if leave fails
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
    // Depend on containerReady to re-run when container is mounted
  }, [roomUrl, playerName, meetingToken, onError, containerReady]);

  if (error) {
    return (
      <div className="voice-chat-error">
        <p>Voice chat error: {error}</p>
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
        {/* Daily.co iframe will be inserted here */}
      </div>
    </div>
  );
};

export default VoiceChat;
