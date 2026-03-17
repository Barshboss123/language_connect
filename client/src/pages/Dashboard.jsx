import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import Avatar from '../components/Avatar';
import IncomingCallModal from '../components/IncomingCallModal';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [inQueue, setInQueue] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [tab, setTab] = useState('partners');
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [notification, setNotification] = useState(null);

  const socket = getSocket(localStorage.getItem('lc_token'));

  function showNotif(msg, type = 'info') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }

  useEffect(() => {
    api.partners().then(setPartners).catch(console.error);
  }, []);

  useEffect(() => {
    socket.on('online_count', setOnlineCount);
    socket.on('incoming_call', ({ roomId, caller }) => {
      setIncomingCall({ roomId, ...caller });
    });
    socket.on('call_accepted', ({ roomId }) => {
      navigate(`/room/${roomId}`);
    });
    socket.on('call_rejected', ({ username }) => {
      showNotif(`${username} declined your call`, 'error');
    });
    socket.on('call_error', ({ message }) => {
      showNotif(message, 'error');
    });
    socket.on('match_found', ({ roomId, partner }) => {
      setInQueue(false);
      showNotif(`Matched with ${partner.username}! Joining room...`, 'success');
      setTimeout(() => navigate(`/room/${roomId}`), 1000);
    });
    socket.on('queue_joined', () => {
      showNotif('Looking for a partner...', 'info');
    });

    return () => {
      socket.off('online_count');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_error');
      socket.off('match_found');
      socket.off('queue_joined');
    };
  }, [socket, navigate]);

  function callPartner(partnerId) {
    socket.emit('call_user', { targetUserId: partnerId });
    showNotif('Calling...', 'info');
  }

  function acceptCall() {
    socket.emit('call_accepted', { roomId: incomingCall.roomId, callerId: incomingCall.userId });
    navigate(`/room/${incomingCall.roomId}`);
    setIncomingCall(null);
  }

  function rejectCall() {
    socket.emit('call_rejected', { callerId: incomingCall.userId });
    setIncomingCall(null);
  }

  function toggleQueue() {
    if (inQueue) {
      socket.emit('leave_queue');
      setInQueue(false);
      showNotif('Left the queue', 'info');
    } else {
      socket.emit('join_queue');
      setInQueue(true);
    }
  }

  async function saveBio() {
    await api.updateProfile({ bio, interests: user.interests || [] });
    setEditBio(false);
    showNotif('Profile updated!', 'success');
  }

  const langFlag = lang => lang === 'Japanese' ? '🇯🇵' : '🇺🇸';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-40 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          notification.type === 'error' ? 'bg-red-500 text-white' :
          notification.type === 'success' ? 'bg-green-500 text-white' :
          'bg-gray-900 text-white'
        }`}>
          {notification.msg}
        </div>
      )}

      <IncomingCallModal
        caller={incomingCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌸</span>
            <span className="font-bold text-gray-900 hidden sm:block">LanguageConnect</span>
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {onlineCount} online
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Random match button */}
            <button
              onClick={toggleQueue}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                inQueue
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {inQueue ? (
                <><span className="animate-spin">⏳</span> Searching...</>
              ) : (
                <><span>🔀</span> <span className="hidden sm:inline">Random Match</span></>
              )}
            </button>

            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 text-sm px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            {/* Profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex flex-col items-center text-center">
                <Avatar username={user?.username} color={user?.avatar_color} size="xl" />
                <h2 className="font-bold text-gray-900 mt-3 text-lg">{user?.username}</h2>
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                  <span>{langFlag(user?.native_lang)} {user?.native_lang}</span>
                  <span className="text-gray-300">·</span>
                  <span>Learning {langFlag(user?.learning_lang)} {user?.learning_lang}</span>
                </div>
              </div>

              {editBio ? (
                <div className="mt-4">
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditBio(false)} className="flex-1 text-xs border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button onClick={saveBio} className="flex-1 text-xs bg-indigo-600 text-white py-1.5 rounded-lg hover:bg-indigo-700">Save</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 text-center min-h-[2rem]">
                    {user?.bio || <span className="italic">No bio yet</span>}
                  </p>
                  <button
                    onClick={() => setEditBio(true)}
                    className="w-full mt-3 text-xs text-indigo-600 border border-indigo-200 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    ✏️ Edit bio
                  </button>
                </div>
              )}

              {user?.interests?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
                  {user.interests.map(i => (
                    <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{i}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Random match card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
              <div className="text-2xl mb-2">🔀</div>
              <h3 className="font-bold mb-1">Quick Match</h3>
              <p className="text-indigo-200 text-xs mb-4 leading-relaxed">
                Jump in the queue and we'll find you a compatible language partner instantly.
              </p>
              <button
                onClick={toggleQueue}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  inQueue
                    ? 'bg-white/20 text-white border border-white/30 animate-pulse'
                    : 'bg-white text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                {inQueue ? '⏳ Searching...' : 'Find a partner'}
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            {/* Tab navigation */}
            <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 shadow-sm w-fit">
              {[
                { id: 'partners', label: '👥 Partners', count: partners.length },
                { id: 'howto', label: '📖 How to' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      tab === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'partners' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-gray-900">Available Partners</h2>
                    <p className="text-sm text-gray-500">
                      {user?.native_lang} speakers learning {user?.learning_lang}
                    </p>
                  </div>
                  <button
                    onClick={() => api.partners().then(setPartners)}
                    className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {partners.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="font-semibold text-gray-900 mb-2">No partners found yet</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Be the first! Try the random match queue or invite a friend.
                    </p>
                    <button
                      onClick={toggleQueue}
                      className="bg-indigo-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Join quick match queue
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {partners.map(partner => (
                      <PartnerCard
                        key={partner.id}
                        partner={partner}
                        onCall={() => callPartner(partner.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'howto' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <h2 className="font-bold text-gray-900 text-xl mb-6">How Language Exchange Works</h2>
                <div className="space-y-6">
                  {[
                    {
                      icon: '🔍',
                      title: 'Find a partner',
                      body: 'Browse the Partners tab to find someone whose native language is your target language. You can also use Quick Match to be paired instantly with a compatible partner.'
                    },
                    {
                      icon: '📹',
                      title: 'Start a video call',
                      body: 'Click "Call" on any partner card to initiate a video call. Once they accept, you\'ll both be placed in a private video room.'
                    },
                    {
                      icon: '⏱️',
                      title: 'Split your time',
                      body: 'A good session is 30 minutes each language. Spend the first 30 minutes speaking in your partner\'s native language, then switch for 30 minutes in yours.'
                    },
                    {
                      icon: '💬',
                      title: 'Use the chat',
                      body: 'During the call, use the chat panel to share vocabulary, write corrections, or paste text without interrupting the spoken conversation.'
                    },
                    {
                      icon: '🤝',
                      title: 'Be patient & encouraging',
                      body: 'Remember: your partner is nervous about their language skills too! Be encouraging, correct mistakes gently, and enjoy the cultural exchange.'
                    },
                  ].map(item => (
                    <div key={item.title} className="flex gap-4">
                      <div className="text-3xl flex-shrink-0">{item.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function PartnerCard({ partner, onCall }) {
  const langFlag = lang => lang === 'Japanese' ? '🇯🇵' : '🇺🇸';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <Avatar username={partner.username} color={partner.avatar_color} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{partner.username}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <span>{langFlag(partner.native_lang)} Native</span>
            <span>·</span>
            <span>Learning {langFlag(partner.learning_lang)}</span>
          </div>
        </div>
      </div>

      {partner.bio && (
        <p className="text-sm text-gray-500 mb-3 leading-relaxed line-clamp-2">{partner.bio}</p>
      )}

      {partner.interests?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {partner.interests.slice(0, 4).map(i => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{i}</span>
          ))}
          {partner.interests.length > 4 && (
            <span className="text-xs text-gray-400">+{partner.interests.length - 4} more</span>
          )}
        </div>
      )}

      <button
        onClick={onCall}
        className="w-full bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
      >
        <span>📹</span> Call {partner.username}
      </button>
    </div>
  );
}
