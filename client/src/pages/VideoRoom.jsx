import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../lib/socket';
import Avatar from '../components/Avatar';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

export default function VideoRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = getSocket(localStorage.getItem('lc_token'));

  // Media
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidates = useRef([]);

  // State
  const [partner, setPartner] = useState(null);
  const [connected, setConnected] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [status, setStatus] = useState('Waiting for partner...');
  const [sessionStart, setSessionStart] = useState(null);
  const [elapsed, setElapsed] = useState('0:00');
  const [localSocketId, setLocalSocketId] = useState(null);

  // Timer
  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStart) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // Setup local stream
  async function getLocalStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      setStatus('Camera/mic access denied. Please allow access and refresh.');
      throw err;
    }
  }

  function createPeerConnection(stream) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = e => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setConnected(true);
      setSessionStart(Date.now());
      setStatus('Connected!');
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('ice_candidate', {
          to: localSocketId || '_',
          roomId,
          candidate: e.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setConnected(false);
        setStatus('Partner disconnected');
      }
    };

    return pc;
  }

  async function addPendingCandidates(pc) {
    for (const c of pendingCandidates.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidates.current = [];
  }

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const stream = await getLocalStream();

      socket.emit('join_room', { roomId });

      socket.on('connect', () => {});
      socket.on('connect_error', () => setStatus('Connection error'));

      socket.on('room_joined', async ({ others }) => {
        if (!isMounted) return;
        if (others.length > 0) {
          // We joined after someone else — they'll send us an offer
          setStatus('Partner found! Connecting...');
        } else {
          setStatus('Waiting for partner to join...');
        }
      });

      socket.on('peer_joined', async ({ socketId, user: peerUser }) => {
        if (!isMounted) return;
        setPartner(peerUser);
        setStatus('Partner joined! Setting up call...');
        setLocalSocketId(socketId);

        // We are the initiator — create offer
        const pc = createPeerConnection(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: socketId, offer });
      });

      socket.on('offer', async ({ from, offer, user: peerUser }) => {
        if (!isMounted) return;
        setPartner(peerUser);
        setLocalSocketId(from);
        setStatus('Connecting...');

        const pc = createPeerConnection(stream);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await addPendingCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      });

      socket.on('answer', async ({ answer }) => {
        if (!isMounted) return;
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await addPendingCandidates(pc);
        }
      });

      socket.on('ice_candidate', async ({ candidate }) => {
        if (!isMounted) return;
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
        } else {
          pendingCandidates.current.push(candidate);
        }
      });

      socket.on('peer_left', () => {
        if (!isMounted) return;
        setConnected(false);
        setStatus('Partner left the call');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
      });

      socket.on('chat_message', ({ from, message, timestamp }) => {
        if (!isMounted) return;
        setMessages(m => [...m, { from, message, timestamp, mine: false }]);
      });
    }

    init().catch(console.error);

    return () => {
      isMounted = false;
      socket.emit('leave_room', { roomId });
      socket.off('room_joined');
      socket.off('peer_joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice_candidate');
      socket.off('peer_left');
      socket.off('chat_message');

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId]);

  function toggleAudio() {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(t => { t.enabled = !audioOn; });
      setAudioOn(!audioOn);
    }
  }

  function toggleVideo() {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(t => { t.enabled = !videoOn; });
      setVideoOn(!videoOn);
    }
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!msgInput.trim()) return;
    socket.emit('chat_message', { roomId, message: msgInput.trim() });
    setMessages(m => [...m, { from: user.username, message: msgInput.trim(), timestamp: Date.now(), mine: true }]);
    setMsgInput('');
  }

  function leaveRoom() {
    socket.emit('leave_room', { roomId });
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    navigate('/dashboard');
  }

  const langFlag = lang => lang === 'Japanese' ? '🇯🇵' : '🇺🇸';

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">🌸 LanguageConnect</span>
          {connected && (
            <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full border border-green-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected · {elapsed}
            </div>
          )}
        </div>

        {partner && (
          <div className="flex items-center gap-2">
            <Avatar username={partner.username} color={partner.avatar_color} size="sm" />
            <div className="hidden sm:block">
              <p className="text-white text-sm font-medium">{partner.username}</p>
              <p className="text-gray-400 text-xs">
                {langFlag(partner.native_lang)} → {langFlag(partner.learning_lang)}
              </p>
            </div>
          </div>
        )}

        {!connected && (
          <div className="text-xs text-gray-400 bg-gray-700 px-3 py-1.5 rounded-full">
            {status}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative bg-black">
          {/* Remote video (main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* No partner yet */}
          {!connected && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="text-5xl mb-4 animate-pulse">📹</div>
                <p className="text-white font-semibold text-lg mb-2">{status}</p>
                <p className="text-gray-400 text-sm">Room: {roomId.slice(0, 8)}...</p>
                {partner && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Avatar username={partner.username} color={partner.avatar_color} size="sm" />
                    <span className="text-gray-300">{partner.username} is here</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 rounded-xl overflow-hidden border-2 border-gray-600 shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!videoOn && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <Avatar username={user?.username} color={user?.avatar_color} size="md" />
              </div>
            )}
          </div>

          {/* Language timer suggestion */}
          {connected && sessionStart && (
            <LanguageTimer sessionStart={sessionStart} user={user} partner={partner} />
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <ControlBtn onClick={toggleAudio} active={audioOn} activeIcon="🎤" inactiveIcon="🔇" label={audioOn ? 'Mute' : 'Unmute'} />
            <ControlBtn onClick={toggleVideo} active={videoOn} activeIcon="📷" inactiveIcon="📵" label={videoOn ? 'Stop video' : 'Start video'} />
            <button
              onClick={() => setChatOpen(o => !o)}
              className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all ${
                chatOpen ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-xl">💬</span>
              <span className="text-xs font-medium">Chat</span>
            </button>
            <button
              onClick={leaveRoom}
              className="flex flex-col items-center gap-1 bg-red-600 text-white px-4 py-2.5 rounded-xl hover:bg-red-700 transition-colors"
            >
              <span className="text-xl">📵</span>
              <span className="text-xs font-medium">Leave</span>
            </button>
          </div>
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Chat</h3>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-gray-500 text-xs text-center mt-4">
                  Share vocabulary, corrections,<br />or notes here
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
                  {!m.mine && (
                    <span className="text-xs text-gray-400 mb-1">{m.from}</span>
                  )}
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm ${
                    m.mine ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-100'
                  }`}>
                    {m.message}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-700 flex gap-2">
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                ↵
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlBtn({ onClick, active, activeIcon, inactiveIcon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all ${
        active ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-red-600/80 text-white'
      }`}
    >
      <span className="text-xl">{active ? activeIcon : inactiveIcon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function LanguageTimer({ sessionStart, user, partner }) {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMins(Math.floor((Date.now() - sessionStart) / 60000));
    }, 5000);
    return () => clearInterval(id);
  }, [sessionStart]);

  if (mins < 1) return null;

  const langFlag = lang => lang === 'Japanese' ? '🇯🇵' : '🇺🇸';
  const currentLang = mins < 30 ? partner?.native_lang : user?.native_lang;
  const suggestion = mins < 30
    ? `Speaking in ${partner?.native_lang} ${langFlag(partner?.native_lang)} (${30 - mins} min left)`
    : mins < 60
    ? `Switch to ${user?.native_lang} ${langFlag(user?.native_lang)} (${60 - mins} min left)`
    : 'Great session! 🎉';

  return (
    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
      {suggestion}
    </div>
  );
}
