'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Copy, CheckCheck, AlertCircle, Cpu, Star, Zap, Shield, Globe, MessageSquare, X, ChevronDown } from 'lucide-react';

// Helper: Extract Video ID from YouTube URL
function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
}

// Helper: Render Markdown-like text professionally
const renderMarkdown = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    
    // Handle Headings (### or **)
    if (trimmed.startsWith('###') || trimmed.startsWith('📌') || trimmed.startsWith('🔑') || trimmed.startsWith('💡')) {
      return (
        <h3 key={i} style={{ 
          color: '#fff', 
          marginTop: '1.5rem', 
          marginBottom: '0.75rem', 
          fontSize: '1.1rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {trimmed}
        </h3>
      );
    }
    
    // Handle Bullets
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
      return (
        <li key={i} style={{ 
          marginLeft: '1rem', 
          marginBottom: '0.5rem', 
          color: '#e5e5e5',
          listStyleType: 'none',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <span style={{ color: '#16a34a', marginTop: '2px' }}>•</span>
          <span>{trimmed.replace(/^[-*•]\s?/, '')}</span>
        </li>
      );
    }
    
    // Handle bold text and clean paragraphs
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={i} style={{ marginBottom: '0.75rem', lineHeight: '1.6', color: '#d1d5db' }}>
        {parts.map((part, j) => 
          part.startsWith('**') && part.endsWith('**') 
            ? <strong key={j} style={{ color: '#fff', fontWeight: '700' }}>{part.slice(2, -2)}</strong> 
            : part
        )}
      </p>
    );
  });
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [isLocalAI, setIsLocalAI] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState(''); 
  const [stats, setStats] = useState({ stars: 128, waitlist: 452 });
  const [hasStarred, setHasStarred] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  
  const worker = useRef(null);

  // Fetch Stats on Load
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch stats', err));

    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url));
    }

    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate': setStatus('Downloading Local AI Engine...'); setProgress(0); break;
        case 'progress': setProgress(e.data.progress); break;
        case 'done': setStatus('Local Engine Ready.'); break;
        case 'ready': setStatus('Local AI analyzing...'); break;
        case 'complete':
          setSummary(e.data.output);
          setLoading(false);
          setStatus('');
          setIsLocalAI(true);
          setTimeout(() => document.getElementById('summary-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
          break;
      }
    };

    worker.current.addEventListener('message', onMessageReceived);
    return () => worker.current?.removeEventListener('message', onMessageReceived);
  }, []);

  const handleStar = async () => {
    if (hasStarred) return;
    setHasStarred(true);
    setStats(prev => ({ ...prev, stars: prev.stars + 1 }));
    try {
      await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'star' }),
      });
    } catch (err) {
      console.error('Failed to star', err);
    }
  };

  const summarizeLocally = (text) => {
    setIsLocalAI(true);
    setStatus('Generating AI summary...');
    worker.current.postMessage({ text });
  };

  const handleSummarize = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    const videoId = extractVideoId(url);
    setLoading(true);
    setSummary('');
    setError('');
    setStatus('Fetching video transcript...');

    try {
      const res = await fetch('/api/transcript?url=' + encodeURIComponent(url.trim()));
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch transcript');
      
      let fullText = data.transcript.map(t => t.text).join(' ');
      if (fullText.length > 50000) fullText = fullText.substring(0, 50000) + '...';

      setStatus('Generating AI summary...');

      const aiRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullText, videoId }),
      });

      const aiData = await aiRes.json();
      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          summarizeLocally(fullText);
          return;
        }
        throw new Error(aiData.error || 'AI summarization failed');
      }

      setSummary(aiData.summary);
      setIsLocalAI(false);
      setStatus('');
      setTimeout(() => document.getElementById('summary-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      if (!isLocalAI) setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinWaitlist = async (e) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || !waitlistEmail.includes('@')) return;

    setWaitlistStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      if (res.ok) {
        setWaitlistStatus('success');
        setStats(prev => ({ ...prev, waitlist: prev.waitlist + 1 }));
      } else {
        setWaitlistStatus('error');
      }
    } catch (err) {
      setWaitlistStatus('error');
    }
  };

  const videoId = extractVideoId(url);

  return (
    <main className="container">
      {/* Header */}
      <header className="header">
        <div className="logo-container">
          <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
            <rect x="15" y="10" width="20" height="80" fill="#16a34a" />
            <rect x="35" y="10" width="55" height="22" fill="#16a34a" />
            <polygon points="35,40 90,40 90,62 35,62" fill="#16a34a" transform="rotate(-25 35 40) translate(0, 10)" />
            <polygon points="15,45 45,45 15,65" fill="#000000" />
          </svg>
          <div className="remma-logo-text">REMMA.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button 
            onClick={handleStar}
            className={`star-badge ${hasStarred ? 'active' : ''}`}
          >
            <Star size={16} fill={hasStarred ? "#16a34a" : "transparent"} />
            <span>{stats.stars} Stars</span>
          </button>
          <div className="social-proof-badge">
            <Globe size={14} />
            <span>{stats.waitlist.toLocaleString()}+ waitlisted</span>
          </div>
        </div>
      </header>

      <section>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
          <div className="chip">Best for Creators & Researchers</div>
          <h1 className="hero-title">
            Watch 20m Videos <br /> in <span className="text-brand">20 Seconds.</span>
          </h1>
          <p className="hero-subtitle">
            The world's first AI-powered YouTube summarizer with <strong>Local Engine Fallback</strong>. 
            Privacy-first. Fast. Intelligent.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSummarize} className="input-container main-shadow">
          <input
            type="text"
            placeholder="Paste YouTube link here..."
            className="input-field-large"
            value={url}
            onChange={e => setUrl(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-large" disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="lucide-spin" size={24} /> : <Zap size={24} />}
            <span>{loading ? 'Analyzing...' : 'Summarize Now'}</span>
          </button>
        </form>

        {videoId && (
          <div className="video-preview-container animate-in">
             <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} alt="Video" />
          </div>
        )}

        {/* Loading/Error/Result sections remain consistent but styled better */}
        {loading && status && (
          <div className="status-indicator">
            <Loader2 className="lucide-spin" size={20} />
            <span>{status}</span>
            {progress > 0 && <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>}
          </div>
        )}

        {error && (
          <div className="error-card">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {summary && !loading && (
          <div className="result-card" id="summary-section">
            <div className="result-header">
              <div className="result-title">
                <CheckCheck className="text-brand" size={22} />
                <h2>Expert Insights</h2>
                {isLocalAI && <span className="local-badge"><Cpu size={12} /> Privacy Mode</span>}
              </div>
              <button onClick={handleCopy} className="icon-btn">
                {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
              </button>
            </div>
            <div className="summary-text animate-in">
              {renderMarkdown(summary)}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="features-grid">
          <div className="feature-card">
            <Zap className="text-brand" />
            <h3>Speed of Light</h3>
            <p>Summaries are generated in under 5 seconds using Llama 3.1 & Gemini Flash.</p>
          </div>
          <div className="feature-card">
            <Shield className="text-brand" />
            <h3>Privacy First</h3>
            <p>Optional Local AI mode runs entirely in your browser. No data leaves your machine.</p>
          </div>
          <div className="feature-card">
            <Globe className="text-brand" />
            <h3>Universal</h3>
            <p>Works with every YouTube video that has a transcript, in any language.</p>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="section-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-num">1</div>
              <h4>Paste URL</h4>
              <p>Just grab the link from your browser or app.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h4>Analyze</h4>
              <p>Our AI fetches the transcript and identifies key moments.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h4>Learn</h4>
              <p>Read the structured insights and save hours of time.</p>
            </div>
          </div>
        </div>

        {/* Waitlist Section */}
        <div className="waitlist-container" id="waitlist">
          <div className="waitlist-content">
            <h2>Join the Inner Circle</h2>
            <p>We are currently in private beta. Join {stats.waitlist}+ others waiting for the browser extension release.</p>
            
            {waitlistStatus === 'success' ? (
              <div className="success-state animate-in">
                <h3>Welcome aboard! 🚀</h3>
                <p>Check your email for confirmation. Spread the word:</p>
                <div className="share-buttons">
                  <a href={`https://twitter.com/intent/tweet?text=I%20just%20joined%20the%20waitlist%20for%20Remma%20AI!%20Finally%20a%20way%20to%20watch%20long%20videos%20in%20seconds.%20Join%20me%3A%20${window.location.href}`} target="_blank" className="share-btn twitter">
                    <X size={18} /> Tweet
                  </a>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`} target="_blank" className="share-btn linkedin">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg> Share
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="waitlist-form">
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="waitlist-input"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  disabled={waitlistStatus === 'loading'}
                  required
                />
                <button type="submit" className="btn-primary" disabled={waitlistStatus === 'loading'}>
                  {waitlistStatus === 'loading' ? 'Saving...' : 'Get Early Access'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="section-container">
          <h2 className="section-title">Common Questions</h2>
          <div className="faq-grid">
            {[
              { q: "Is it really free?", a: "Yes, currently in beta it is completely free to use. We use powerful free-tier APIs and local processing to keep it that way." },
              { q: "How does Local AI work?", a: "We use WebGPU and Transformers.js to run the AI directly in your browser. It doesn't use our servers, making it 100% private." },
              { q: "Can it summarize any video?", a: "It works on any video that has captions or a transcript provided by YouTube." }
            ].map((faq, i) => (
              <div key={i} className={`faq-item ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                <div className="faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown size={18} />
                </div>
                {activeFaq === i && <div className="faq-answer animate-in">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>© 2026 Remma AI. Built for the curious.</div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="mailto:hello@remma.ai">Contact</a>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --brand-gradient: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
        }
        .hero-title { font-size: 4rem; font-weight: 800; letter-spacing: -2px; margin-bottom: 1.5rem; line-height: 1; }
        .hero-subtitle { font-size: 1.25rem; color: var(--muted-text); max-width: 600px; margin: 0 auto; line-height: 1.6; }
        .chip { display: inline-block; padding: 4px 12px; border-radius: 100px; background: rgba(22,163,74,0.1); color: #16a34a; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1rem; border: 1px solid rgba(22,163,74,0.2); }
        .star-badge { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--panel-border); padding: 6px 14px; borderRadius: 100px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; font-weight: 600; }
        .star-badge:hover { background: rgba(255,255,255,0.1); }
        .star-badge.active { border-color: #16a34a; color: #16a34a; }
        .social-proof-badge { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted-text); }
        .input-container.main-shadow { box-shadow: 0 0 80px rgba(0,0,0,0.5), 0 0 20px rgba(22,163,74,0.1); border: 1px solid rgba(255,255,255,0.1); padding: 8px; border-radius: 16px; margin-bottom: 4rem; }
        .input-field-large { flex: 1; background: transparent; border: none; padding: 1.25rem; font-size: 1.125rem; color: #fff; outline: none; }
        .btn-large { background: var(--brand-gradient); color: #fff; border: none; padding: 0 2rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: transform 0.2s; }
        .btn-large:hover { transform: translateY(-2px); }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin: 4rem 0; }
        .feature-card { padding: 2rem; background: rgba(255,255,255,0.03); border: 1px solid var(--panel-border); border-radius: 20px; text-align: left; }
        .feature-card h3 { margin: 1rem 0 0.5rem; }
        .feature-card p { color: var(--muted-text); font-size: 0.875rem; line-height: 1.5; }
        .section-container { margin: 6rem 0; text-align: center; }
        .section-title { font-size: 2rem; margin-bottom: 3rem; }
        .steps-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
        .step { position: relative; padding: 2rem; }
        .step-num { width: 32px; height: 32px; background: #16a34a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-weight: 800; }
        .waitlist-container { background: #111; border: 1px solid var(--panel-border); border-radius: 30px; padding: 4rem 2rem; margin: 6rem 0; background: radial-gradient(circle at top right, rgba(22,163,74,0.05), transparent); }
        .waitlist-form { display: flex; gap: 1rem; max-width: 500px; margin: 2rem auto 0; }
        .waitlist-input { flex: 1; background: #000; border: 1px solid var(--panel-border); padding: 1rem; border-radius: 12px; color: #fff; }
        .btn-primary { background: #fff; color: #000; border: none; padding: 0 1.5rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .faq-grid { max-width: 700px; margin: 0 auto; text-align: left; }
        .faq-item { border-bottom: 1px solid var(--panel-border); padding: 1.5rem 0; cursor: pointer; }
        .faq-question { display: flex; justify-content: space-between; align-items: center; font-weight: 600; }
        .faq-answer { padding-top: 1rem; color: var(--muted-text); font-size: 0.95rem; line-height: 1.6; }
        .share-buttons { display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem; }
        .share-btn { padding: 10px 20px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-weight: 600; text-decoration: none; font-size: 0.9rem; }
        .share-btn.twitter { background: #fff; color: #000; }
        .share-btn.linkedin { background: #0077b5; color: #fff; }
        .footer { border-top: 1px solid var(--panel-border); padding: 3rem 0; color: var(--muted-text); font-size: 0.8rem; display: flex; justify-content: space-between; }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-links a { color: inherit; text-decoration: none; }
        @media (max-width: 768px) {
          .features-grid, .steps-container { grid-template-columns: 1fr; }
          .hero-title { font-size: 2.5rem; }
          .waitlist-form { flex-direction: column; }
        }
      `}} />
    </main>
  );
}

