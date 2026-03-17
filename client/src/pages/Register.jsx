import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const INTERESTS = [
  'Anime', 'Manga', 'Video games', 'J-Pop / K-Pop', 'Cooking', 'Travel',
  'Sports', 'Music', 'Movies', 'Books', 'Technology', 'Business', 'Art',
  'Fitness', 'Nature', 'Photography'
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    native_lang: '', learning_lang: '',
    bio: '', interests: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleInterest(i) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter(x => x !== i)
        : [...f.interests, i]
    }));
  }

  function handleNativeLang(lang) {
    setForm(f => ({
      ...f,
      native_lang: lang,
      learning_lang: lang === 'Japanese' ? 'English' : 'Japanese'
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors">
            <span>←</span> Back to home
          </Link>
          <div className="text-4xl mb-3">🌸</div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Join the language exchange community</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={e => { e.preventDefault(); if (!form.native_lang) return; setStep(2); }} className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-4">Account details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  required
                  placeholder="sakura_tanaka"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">I am a native speaker of...</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { lang: 'Japanese', flag: '🇯🇵', sub: '日本語' },
                    { lang: 'English', flag: '🇺🇸', sub: 'English' }
                  ].map(({ lang, flag, sub }) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleNativeLang(lang)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        form.native_lang === lang
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{flag}</div>
                      <div className="font-semibold text-gray-900">{lang}</div>
                      <div className="text-xs text-gray-500">{sub}</div>
                    </button>
                  ))}
                </div>
                {form.native_lang && (
                  <p className="text-sm text-indigo-600 mt-2">
                    ✓ You'll be learning {form.learning_lang}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!form.native_lang || !form.username || !form.email || !form.password}
                className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-4">Tell us about yourself</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Hi! I'm from Tokyo and love anime and cooking..."
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Interests <span className="text-gray-400 font-normal">(pick any)</span></label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        form.interests.includes(i)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Start talking! 🎌'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
