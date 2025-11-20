import React, { useEffect, useState, useCallback } from 'react';
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

  // Event handlers defined before useEffect to avoid dependency warnings
  const handleJoinedMeeting = useCallback((event, frame) => {
    console.log('[VoiceChat] Joined meeting:', event);
    setIsJoined(true);

    // Get initial participants
    if (frame) {
      const allParticipants = frame.participants();
      setParticipants(allParticipants);
    }
  }, []);

  const handleParticipantUpdate = useCallback((event, frame) => {
    console.log('[VoiceChat] Participant updated:', event);

    if (frame) {
      const allParticipants = frame.participants();
      setParticipants(allParticipants);
    }
  }, []);

  const handleParticipantLeft = useCallback((event, frame) => {
    console.log('[VoiceChat] Participant left:', event);

    if (frame) {
      const allParticipants = frame.participants();
      setParticipants(allParticipants);
    }
  }, []);

  const handleError = useCallback((error) => {
    console.error('[VoiceChat] Daily error:', error);
    setError(error.errorMsg || 'Voice chat error');
    if (onError) onError(error);
  }, [onError]);

  // Initialize Daily call frame
  useEffect(() => {
    if (!roomUrl) {
      console.log('[VoiceChat] No room URL provided');
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

    setCallFrame(frame);

    // Set up event listeners with frame passed as second argument
    frame
      .on('joined-meeting', (event) => handleJoinedMeeting(event, frame))
      .on('participant-joined', (event) => handleParticipantUpdate(event, frame))
      .on('participant-updated', (event) => handleParticipantUpdate(event, frame))
      .on('participant-left', (event) => handleParticipantLeft(event, frame))
      .on('error', handleError);

    // Join the room
    frame
      .join({
        url: roomUrl,
        userName: playerName,
        userId: playerId,
        startAudioOff: false, // Mic enabled by default
        startVideoOff: true,   // No video
      })
      .then(() => {
        console.log('[VoiceChat] Successfully joined room');
        setIsJoined(true);
      })
      .catch((err) => {
        console.error('[VoiceChat] Error joining room:', err);
        setError('Failed to join voice chat');
        if (onError) onError(err);
      });

    // Cleanup on unmount
    return () => {
      if (frame) {
        console.log('[VoiceChat] Cleaning up call frame');
        frame.leave()
          .then(() => {
            frame.destroy();
            console.log('[VoiceChat] Left and destroyed call frame');
          })
          .catch((err) => {
            console.warn('[VoiceChat] Error during cleanup:', err);
            // Destroy anyway even if leave fails
            try {
              frame.destroy();
            } catch (destroyErr) {
              console.warn('[VoiceChat] Error destroying frame:', destroyErr);
            }
          });
      }
    };
  }, [roomUrl, playerName, playerId, onError, handleJoinedMeeting, handleParticipantUpdate, handleParticipantLeft, handleError]);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    if (!callFrame) return;

    const newMutedState = !isMuted;
    callFrame.setLocalAudio(!newMutedState);
    setIsMuted(newMutedState);
    console.log(`[VoiceChat] ${newMutedState ? 'Muted' : 'Unmuted'} microphone`);
  }, [callFrame, isMuted]);

  if (error) {
    return (
      <div className="voice-chat-error">
        <p>Voice chat error: {error}</p>
      </div>
    );
  }

  if (!roomUrl) {
    return null;
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
              className={`participant ${participant.local ? 'local' : ''} ${
                participant.audio ? 'speaking' : 'muted'
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
