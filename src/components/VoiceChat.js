import React, { useEffect, useState, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VoiceChat.css';

/**
 * VoiceChat Component
 * Manages Daily.co voice chat integration for the game
 */
const VoiceChat = ({ roomUrl, playerName, onError }) => {
  const [error, setError] = useState(null);

  // Use ref to track if we're currently cleaning up to prevent re-initialization
  const isCleaningUpRef = useRef(false);
  const frameRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Initialize Daily call frame
  useEffect(() => {
    if (!roomUrl) {
      console.log('[VoiceChat] No room URL provided');
      return;
    }

    // Prevent re-initialization if cleanup is in progress
    if (isCleaningUpRef.current) {
      console.log('[VoiceChat] Cleanup in progress, skipping initialization');
      return;
    }

    console.log('[VoiceChat] Initializing Daily.co with room:', roomUrl);

    // Prevent duplicate instances - destroy any existing frames first
    const existingFrame = DailyIframe.getCallInstance();
    if (existingFrame) {
      console.log('[VoiceChat] Destroying existing frame before creating new one');
      existingFrame.destroy();
    }

    // Create Daily call frame - will be embedded in our video container
    const frame = DailyIframe.createFrame(videoContainerRef.current, {
      showLeaveButton: false,
      showFullscreenButton: false,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '8px',
      },
    });

    frameRef.current = frame;

    // Event handler for errors
    const handleError = (error) => {
      console.error('[VoiceChat] Daily error:', error);
      setError(error.errorMsg || 'Voice chat error');
      if (onError) onError(error);
    };

    // Set up error event listener
    frame.on('error', handleError);

    // Join the room with only supported Daily.co properties
    frame
      .join({
        url: roomUrl,
        userName: playerName,
        // Note: user_id is not supported in join() - it should be set via meeting tokens
      })
      .then(() => {
        console.log('[VoiceChat] Successfully joined room');

        // Enable microphone by default, keep video off
        frameRef.current.setLocalAudio(true);
        frameRef.current.setLocalVideo(false);
        console.log('[VoiceChat] Microphone enabled, video disabled by default');
      })
      .catch((err) => {
        console.error('[VoiceChat] Error joining room:', err);
        setError('Failed to join voice chat');
        if (onError) onError(err);
      });

    // Cleanup on unmount
    return () => {
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
    // Only depend on the actual props, not the callbacks
  }, [roomUrl, playerName, onError]);

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
      <div className="video-container" ref={videoContainerRef}>
        {/* Daily.co iframe will be inserted here */}
      </div>
    </div>
  );
};

export default VoiceChat;
