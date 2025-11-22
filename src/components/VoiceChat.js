import React, { useEffect, useState, useCallback, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VoiceChat.css';

/**
 * VoiceChat Component
 * Manages Daily.co voice chat integration for the game
 */
const VoiceChat = ({ roomUrl, playerName, playerId, onError }) => {
  const [callFrame, setCallFrame] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [participants, setParticipants] = useState({});
  const [error, setError] = useState(null);

  // Use ref to track if we're currently cleaning up to prevent re-initialization
  const isCleaningUpRef = useRef(false);
  const frameRef = useRef(null);

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

    // Create Daily call frame
    const frame = DailyIframe.createFrame({
      iframeStyle: {
        position: 'fixed',
        width: '0px',
        height: '0px',
        border: '0',
        visibility: 'hidden',
      },
      showLeaveButton: false,
      showFullscreenButton: false,
    });

    frameRef.current = frame;
    setCallFrame(frame);

    // Event handlers - defined inline to avoid dependency issues
    const handleJoinedMeeting = (event) => {
      console.log('[VoiceChat] Joined meeting:', event);
      setIsJoined(true);

      // Get initial participants
      if (frameRef.current) {
        const allParticipants = frameRef.current.participants();
        setParticipants(allParticipants);
      }
    };

    const handleParticipantUpdate = (event) => {
      console.log('[VoiceChat] Participant updated:', event);

      if (frameRef.current) {
        const allParticipants = frameRef.current.participants();
        setParticipants(allParticipants);
      }
    };

    const handleParticipantLeft = (event) => {
      console.log('[VoiceChat] Participant left:', event);

      if (frameRef.current) {
        const allParticipants = frameRef.current.participants();
        setParticipants(allParticipants);
      }
    };

    const handleError = (error) => {
      console.error('[VoiceChat] Daily error:', error);
      setError(error.errorMsg || 'Voice chat error');
      if (onError) onError(error);
    };

    // Set up event listeners
    frame
      .on('joined-meeting', handleJoinedMeeting)
      .on('participant-joined', handleParticipantUpdate)
      .on('participant-updated', handleParticipantUpdate)
      .on('participant-left', handleParticipantLeft)
      .on('error', handleError);

    // Join the room with only supported Daily.co properties
    frame
      .join({
        url: roomUrl,
        userName: playerName,
        // Note: user_id is not supported in join() - it should be set via meeting tokens
      })
      .then(() => {
        console.log('[VoiceChat] Successfully joined room');

        // Enable microphone by default
        frameRef.current.setLocalAudio(true);

        setIsJoined(true);
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
  }, [roomUrl, playerName, playerId, onError]);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    if (!frameRef.current) return;

    const newMutedState = !isMuted;
    frameRef.current.setLocalAudio(!newMutedState);
    setIsMuted(newMutedState);
    console.log(`[VoiceChat] ${newMutedState ? 'Muted' : 'Unmuted'} microphone`);
  }, [isMuted]);

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
      <div className="voice-chat-header">
        <span className="voice-chat-title">
          {isJoined ? '🎙️ Voice Chat Active' : '⏳ Connecting...'}
        </span>
      </div>

      <div className="voice-chat-controls">
        <button
          className={`voice-chat-button ${isMuted ? 'muted' : 'unmuted'}`}
          onClick={toggleMute}
          disabled={!isJoined}
          title={isMuted ? 'Click to unmute' : 'Click to mute'}
        >
          {isMuted ? '🔇 Muted' : '🔊 Unmute'}
        </button>
      </div>

      <div className="voice-chat-participants">
        <div className="participant-count">
          {Object.keys(participants).length} participant{Object.keys(participants).length !== 1 ? 's' : ''}
        </div>

        <div className="participants-list">
          {Object.entries(participants).map(([id, participant]) => (
            <div
              key={id}
              className={`participant ${participant.local ? 'local' : ''} ${participant.audio ? 'speaking' : 'muted'
                }`}
            >
              <span className="participant-icon">
                {participant.audio ? '🎤' : '🔇'}
              </span>
              <span className="participant-name">
                {participant.user_name || 'Unknown'}
                {participant.local && ' (You)'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
