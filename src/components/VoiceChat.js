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

  // Initialize Daily call frame
  useEffect(() => {
    if (!roomUrl) {
      console.log('[VoiceChat] No room URL provided');
      return;
    }

    console.log('[VoiceChat] Initializing Daily.co with room:', roomUrl);

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

    // Set up event listeners
    frame
      .on('joined-meeting', handleJoinedMeeting)
      .on('participant-joined', handleParticipantUpdate)
      .on('participant-updated', handleParticipantUpdate)
      .on('participant-left', handleParticipantLeft)
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
        frame.leave().then(() => {
          frame.destroy();
          console.log('[VoiceChat] Left and destroyed call frame');
        });
      }
    };
  }, [roomUrl, playerName, playerId, onError]);

  const handleJoinedMeeting = useCallback((event) => {
    console.log('[VoiceChat] Joined meeting:', event);
    setIsJoined(true);

    // Get initial participants
    if (callFrame) {
      const allParticipants = callFrame.participants();
      setParticipants(allParticipants);
    }
  }, [callFrame]);

  const handleParticipantUpdate = useCallback((event) => {
    console.log('[VoiceChat] Participant updated:', event);

    if (callFrame) {
      const allParticipants = callFrame.participants();
      setParticipants(allParticipants);
    }
  }, [callFrame]);

  const handleParticipantLeft = useCallback((event) => {
    console.log('[VoiceChat] Participant left:', event);

    if (callFrame) {
      const allParticipants = callFrame.participants();
      setParticipants(allParticipants);
    }
  }, [callFrame]);

  const handleError = useCallback((error) => {
    console.error('[VoiceChat] Daily error:', error);
    setError(error.errorMsg || 'Voice chat error');
    if (onError) onError(error);
  }, [onError]);

  // Toggle mute/unmute
  const toggleMute = useCallback(() => {
    if (!callFrame) return;

    const newMutedState = !isMuted;
    callFrame.setLocalAudio(!newMutedState);
    setIsMuted(newMutedState);
    console.log(`[VoiceChat] ${newMutedState ? 'Muted' : 'Unmuted'} microphone`);
  }, [callFrame, isMuted]);

  // Leave voice chat
  const leaveVoiceChat = useCallback(() => {
    if (callFrame) {
      callFrame.leave().then(() => {
        console.log('[VoiceChat] Left voice chat');
        setIsJoined(false);
      });
    }
  }, [callFrame]);

  // Get list of active speakers
  const getActiveSpeakers = () => {
    return Object.entries(participants)
      .filter(([id, p]) => p.audio && !p.local)
      .map(([id, p]) => p.user_name || 'Unknown');
  };

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
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇 Unmuted' : '🔊 Mute'}
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
