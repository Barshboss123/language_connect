import { Link } from 'react-router-dom';

const features = [
  { icon: '🎌', title: 'Japanese ↔ English', desc: 'Connect native Japanese speakers with native English speakers for authentic language exchange.' },
  { icon: '📹', title: 'Live Video Calls', desc: 'Face-to-face conversations over high-quality video. Real people, real practice, real progress.' },
  { icon: '🔀', title: 'Smart Matching', desc: 'We pair you with someone who knows what you want to learn, and wants to learn what you know.' },
  { icon: '⏱️', title: 'Structured Sessions', desc: 'Each session alternates languages so both partners get equal practice time.' },
  { icon: '💬', title: 'In-Call Chat', desc: 'Send text corrections, vocabulary, and notes without interrupting the conversation.' },
  { icon: '🆓', title: 'Completely Free', desc: 'No subscriptions, no paywalls. Language exchange is a gift — we keep it that way.' },
];

const steps = [
  { num: '01', title: 'Create your profile', desc: 'Tell us your native language, what you\'re learning, and your interests.' },
  { num: '02', title: 'Find a partner', desc: 'Browse available partners or jump into the random match queue instantly.' },
  { num: '03', title: 'Start talking!', desc: 'Join a video room and start your exchange. 30 minutes each language.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <span className="font-bold text-xl text-gray-900">LanguageConnect</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium ml-1">日英</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Sign in
          </Link>
          <Link to="/register" className="bg-indigo-600 text-white font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-pink-50 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8 shadow-sm">
            <span>🌏</span> Free Japanese ↔ English language exchange
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Speak Japanese.<br />
            <span className="text-indigo-600">Make a friend.</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with native speakers through live video calls. Japanese learners meet English learners —
            you teach each other, for free, every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-indigo-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 text-lg">
              Start talking for free →
            </Link>
            <Link to="/login" className="bg-white text-gray-700 font-semibold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200 text-lg">
              Sign in
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-5">No credit card required · 100% free forever</p>
        </div>

        {/* Floating flags */}
        <div className="absolute top-10 left-10 text-5xl opacity-20 rotate-12">🇯🇵</div>
        <div className="absolute top-16 right-16 text-5xl opacity-20 -rotate-12">🇺🇸</div>
        <div className="absolute bottom-10 left-1/4 text-3xl opacity-15 rotate-6">🗾</div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">How it works</h2>
          <p className="text-center text-gray-500 mb-16">Three simple steps to your first conversation</p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(s => (
              <div key={s.num} className="text-center">
                <div className="text-6xl font-black text-indigo-100 mb-3">{s.num}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything you need</h2>
          <p className="text-center text-gray-500 mb-16">Built specifically for Japanese–English language exchange</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6">🌸</div>
          <h2 className="text-4xl font-bold mb-4">Ready to start?</h2>
          <p className="text-indigo-200 text-lg mb-8">
            Join thousands of people learning Japanese and English together.
          </p>
          <Link to="/register" className="bg-white text-indigo-700 font-bold px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors text-lg shadow-lg">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>🌸 LanguageConnect — Free Japanese ↔ English video exchange</p>
      </footer>
    </div>
  );
}
