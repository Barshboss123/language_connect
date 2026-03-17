import Avatar from './Avatar';

export default function IncomingCallModal({ caller, onAccept, onReject }) {
  if (!caller) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center animate-bounce-in">
        <div className="relative inline-block mb-4">
          <Avatar username={caller.username} color={caller.avatar_color} size="xl" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white animate-ping" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Incoming call</h2>
        <p className="text-gray-600 mb-1">
          <span className="font-semibold">{caller.username}</span> is calling you
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-6">
          <span>{caller.native_lang === 'Japanese' ? '🇯🇵' : '🇺🇸'} {caller.native_lang}</span>
          <span>→</span>
          <span>{caller.learning_lang === 'Japanese' ? '🇯🇵' : '🇺🇸'} {caller.learning_lang}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 bg-red-100 text-red-600 font-semibold py-3 rounded-xl hover:bg-red-200 transition-colors"
          >
            📵 Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition-colors shadow-lg"
          >
            📞 Accept
          </button>
        </div>
      </div>
    </div>
  );
}
