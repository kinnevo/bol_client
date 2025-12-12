import React, { useEffect, useState, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VoiceChat.css';

/**
 * VoiceChat Component
 * Manages Daily.co voice chat integration for the game
 * Uses createCallObject for auto-join capability (no pre-join screen)
 */
const VoiceChat = ({ roomUrl, playerName, meetingToken, onError, onMeetingEnded }) => {
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);

  // Use ref to track if we're currently cleaning up to prevent re-initialization
  const isCleaningUpRef = useRef(false);
  const callObjectRef = useRef(null);
  const videoContainerRef = useRef(null);

  // Callback ref to detect when the container is mounted
  const setVideoContainerRef = (node) => {
    videoContainerRef.current = node;
    if (node && !containerReady) {
      setContainerReady(true);
    }
  };

  // Initialize Daily call object
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
      // Prevent duplicate instances - destroy any existing call objects first
      const existingCall = DailyIframe.getCallInstance();
      if (existingCall) {
        console.log('[VoiceChat] Destroying existing call before creating new one');
        try {
          await existingCall.leave().catch(() => {});
          await existingCall.destroy();
          console.log('[VoiceChat] Existing call destroyed successfully');
        } catch (err) {
          console.warn('[VoiceChat] Error destroying existing call:', err);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Check if we should still proceed
      if (isCancelled || !videoContainerRef.current) {
        console.log('[VoiceChat] Initialization cancelled or container gone');
        return;
      }

      // Create Daily call object (not iframe) for auto-join capability
      const callObject = DailyIframe.createCallObject({
        subscribeToTracksAutomatically: true,
        dailyConfig: {
          experimentalChromeVideoMuteLightOff: true,
        },
      });

      if (isCancelled) {
        callObject.destroy();
        return;
      }

      callObjectRef.current = callObject;

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
      callObject.on('error', handleError);

      try {
        // Build join config
        const joinConfig = {
          url: roomUrl,
          startVideoOff: true,
          startAudioOff: false,
        };

        if (meetingToken) {
          joinConfig.token = meetingToken;
          console.log('[VoiceChat] Auto-joining with meeting token');
        } else {
          joinConfig.userName = playerName;
          console.log('[VoiceChat] Auto-joining with userName');
        }

        // Pre-auth to check room access
        await callObject.preAuth(joinConfig);
        console.log('[VoiceChat] Pre-auth successful');

        if (isCancelled) return;

        // Start camera/mic before joining (this skips the pre-join UI)
        await callObject.startCamera({
          startVideoOff: true,
          startAudioOff: false,
        });
        console.log('[VoiceChat] Camera started');

        if (isCancelled) return;

        // Join the call - should auto-join without pre-join screen
        await callObject.join(joinConfig);
        console.log('[VoiceChat] Successfully joined room');

        if (isCancelled) return;

        // Now create the iframe and attach it to our container
        // We need to create a frame that wraps our call object
        if (videoContainerRef.current) {
          const iframe = callObject.iframe();
          if (iframe) {
            // Style the iframe
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = '0';
            iframe.style.borderRadius = '8px';

            // Clear container and append iframe
            videoContainerRef.current.innerHTML = '';
            videoContainerRef.current.appendChild(iframe);
            console.log('[VoiceChat] Iframe attached to container');
          }
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
      const currentCall = callObjectRef.current;

      if (currentCall) {
        console.log('[VoiceChat] Cleaning up call object');
        currentCall.leave()
          .then(() => {
            currentCall.destroy();
            console.log('[VoiceChat] Left and destroyed call');
          })
          .catch((err) => {
            console.warn('[VoiceChat] Error during cleanup:', err);
            try {
              currentCall.destroy();
            } catch (destroyErr) {
              console.warn('[VoiceChat] Error destroying call:', destroyErr);
            }
          })
          .finally(() => {
            callObjectRef.current = null;
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
