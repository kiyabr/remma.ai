import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Zap, X, Copy, CheckCheck, Loader2, Sparkles, ChevronRight, Share2, Globe, Github } from 'lucide-react';

// --- Configuration ---
// Change this to your deployed Vercel URL (e.g., https://remma-ai.vercel.app)
const API_BASE_URL = "http://localhost:3000"; 

function RemmaExtension() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Extract Video Title
  const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.innerText || 
                     document.querySelector('yt-formatted-string.ytd-watch-metadata')?.innerText || 
                     "YouTube Video";

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const summarizeVideo = async () => {
    setLoading(true);
    setStatus('Analyzing video content...');
    setSummary('');

    try {
      const playerResponseMatch = document.body.innerHTML.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (!playerResponseMatch) throw new Error("Could not find video data");
      
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      if (!captions || !captions.length) throw new Error("Captions are disabled for this video.");

      const transcriptUrl = captions[0].baseUrl;
      const res = await fetch(transcriptUrl);
      const str = await res.text();
      
      const matches = [...str.matchAll(/<text[^>]*>(.*?)<\/text>/gi)];
      let text = matches.map(m => m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')).join(' ');

      if (!text) throw new Error("Transcript is empty");
      if (text.length > 25000) text = text.substring(0, 25000) + '...';

      setStatus('Generative AI is thinking...');
      
      const aiRes = await fetch(`${API_BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, videoId: new URLSearchParams(window.location.search).get('v') })
      });

      if (!aiRes.ok) {
        const errData = await aiRes.json().catch(() => ({}));
        throw new Error(errData.error || 'AI request failed');
      }
      
      const aiData = await aiRes.json();
      setSummary(aiData.summary);
      setStatus('');
    } catch (err) {
      setStatus(`Error: ${err.message || "Failed to summarize"}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      
      // Professional Icon mapping
      const isOverview = trimmed.includes('Overview') || trimmed.startsWith('📌');
      const isKeyPoints = trimmed.includes('Key Points') || trimmed.startsWith('🔑');
      const isTakeaways = trimmed.includes('Takeaways') || trimmed.startsWith('💡');

      if (isOverview || isKeyPoints || isTakeaways) {
        return (
          <h4 key={i} className="remma-section-header">
            <Sparkles size={14} />
            {trimmed.replace(/[📌🔑💡\*\s]/g, '')}
          </h4>
        );
      }
      
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        return (
          <div key={i} className="remma-bullet-item">
            <div className="remma-bullet-dot" />
            <span>{trimmed.replace(/^[-*•]\s?/, '')}</span>
          </div>
        );
      }
      
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="remma-paragraph">
          {parts.map((part, j) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={j}>{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Loom Inspired */}
      <div 
        className={`remma-fab ${isOpen ? 'active' : ''} ${loading ? 'loading' : ''}`}
        onClick={toggleSidebar}
        title="Summarize with Remma AI"
      >
        <div className="remma-fab-icon">
          <svg viewBox="0 0 100 100" fill="none">
            <rect x="15" y="10" width="20" height="80" fill="#16a34a" />
            <rect x="35" y="10" width="55" height="22" fill="#16a34a" />
            <polygon points="35,40 90,40 90,62 35,62" fill="#16a34a" transform="rotate(-25 35 40) translate(0, 10)" />
            <polygon points="15,45 45,45 15,65" fill="#000000" />
          </svg>
        </div>
        {loading && <div className="remma-fab-pulse" />}
      </div>

      {/* Slide-out Sidebar Dashboard */}
      <div className={`remma-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="remma-sidebar-header">
          <div className="remma-brand">
             <Sparkles size={16} className="text-brand" />
             <span>REMMA<span className="text-brand">.</span></span>
          </div>
          <button className="remma-close-btn" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        <div className="remma-sidebar-content">
          <div className="remma-video-info">
            <div className="remma-tag">Now Watching</div>
            <h2 className="remma-video-title">{videoTitle}</h2>
          </div>

          {!summary && !loading && (
             <div className="remma-empty-state">
                <div className="remma-empty-icon">
                  <Zap size={32} />
                </div>
                <h3>Ready to summarize?</h3>
                <p>Get the key insights of this video in seconds without watching the whole thing.</p>
                <button className="remma-primary-btn" onClick={summarizeVideo}>
                  <Zap size={18} />
                  <span>Summarize Now</span>
                </button>
             </div>
          )}

          {loading && (
            <div className="remma-loading-state">
              <Loader2 size={32} className="spin" />
              <p>{status}</p>
              <div className="remma-progress-track">
                <div className="remma-progress-fill" />
              </div>
            </div>
          )}

          {status && !loading && status.startsWith('Error') && (
            <div className="remma-error-state">
              <p>{status}</p>
              <button className="remma-secondary-btn" onClick={summarizeVideo}>Try Again</button>
            </div>
          )}

          {summary && !loading && (
            <div className="remma-summary-container animate-fade-in">
              <div className="remma-summary-toolbar">
                <span className="remma-badge">AI Summary</span>
                <button className="remma-icon-btn" onClick={handleCopy}>
                  {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="remma-summary-body">
                {renderMarkdown(summary)}
              </div>
            </div>
          )}
        </div>

        <div className="remma-sidebar-footer">
          <div className="remma-footer-links">
            <a href="https://remma-ai.vercel.app" target="_blank" title="Open Web App"><Globe size={16} /></a>
            <a href="#" title="Share Summary"><Share2 size={16} /></a>
          </div>
          <div className="remma-version">v1.0.0 (Full Version)</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --remma-brand: #16a34a;
          --remma-black: #0a0a0a;
          --remma-border: rgba(255,255,255,0.1);
          --remma-text: #e4e4e7;
          --remma-muted: #a1a1aa;
        }

        .remma-fab {
          position: fixed;
          right: 24px;
          bottom: 100px;
          width: 56px;
          height: 56px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px var(--remma-border);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .remma-fab:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 12px 32px rgba(0,0,0,0.6);
        }

        .remma-fab.active {
          right: 380px;
          transform: rotate(-90deg);
        }

        .remma-fab-icon {
          width: 32px;
          height: 32px;
        }

        .remma-fab.loading {
          animation: remma-pulse 2s infinite ease-in-out;
        }

        @keyframes remma-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        .remma-sidebar {
          position: fixed;
          top: 0;
          right: -400px;
          width: 360px;
          height: 100vh;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-left: 1px solid var(--remma-border);
          z-index: 2147483646;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', system-ui, sans-serif;
          color: var(--remma-text);
          transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: -20px 0 50px rgba(0,0,0,0.5);
        }

        .remma-sidebar.open {
          right: 0;
        }

        .remma-sidebar-header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--remma-border);
        }

        .remma-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          font-size: 14px;
        }

        .text-brand { color: var(--remma-brand); }

        .remma-close-btn {
          background: transparent;
          border: none;
          color: var(--remma-muted);
          cursor: pointer;
          border-radius: 8px;
          padding: 4px;
          transition: all 0.2s;
        }
        .remma-close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .remma-sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .remma-video-info { margin-bottom: 24px; }
        .remma-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--remma-brand); margin-bottom: 8px; letter-spacing: 0.1em; }
        .remma-video-title { font-size: 16px; font-weight: 600; line-height: 1.4; color: #fff; }

        .remma-empty-state, .remma-loading-state {
          text-align: center;
          padding: 40px 20px;
          animation: animate-in 0.4s ease-out;
        }

        .remma-empty-icon {
          width: 64px;
          height: 64px;
          background: rgba(22, 163, 74, 0.1);
          color: var(--remma-brand);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .remma-primary-btn {
          width: 100%;
          background: var(--remma-brand);
          color: #000;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 24px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .remma-primary-btn:hover { transform: translateY(-2px); }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from {transform: rotate(0deg);} to {transform: rotate(360deg);} }

        .remma-progress-track { width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin-top: 16px; overflow: hidden; }
        .remma-progress-fill { width: 40%; height: 100%; background: var(--remma-brand); animation: progress-move 2s infinite ease-in-out; }
        @keyframes progress-move { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }

        .remma-summary-container { animation: animate-in 0.5s ease-out; }
        .remma-summary-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 10px; border: 1px solid var(--remma-border); }
        .remma-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; background: var(--remma-brand); color: #000; padding: 2px 8px; border-radius: 4px; }
        .remma-icon-btn { background: transparent; border: none; color: var(--remma-muted); cursor: pointer; }

        .remma-section-header { color: #fff; font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-top: 24px; margin-bottom: 12px; }
        .remma-bullet-item { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; font-size: 13.5px; line-height: 1.6; }
        .remma-bullet-dot { min-width: 6px; height: 6px; background: var(--remma-brand); border-radius: 50%; margin-top: 8px; }
        .remma-paragraph { font-size: 13.5px; line-height: 1.6; margin-bottom: 12px; color: #d1d5db; }
        .remma-paragraph strong { color: #fff; font-weight: 600; }

        .remma-sidebar-footer { padding: 20px 24px; border-top: 1px solid var(--remma-border); display: flex; justify-content: space-between; align-items: center; }
        .remma-footer-links { display: flex; gap: 16px; color: var(--remma-muted); }
        .remma-footer-links a { color: inherit; transition: color 0.2s; }
        .remma-footer-links a:hover { color: #fff; }
        .remma-version { font-size: 10px; font-weight: 600; color: var(--remma-muted); }

        @keyframes animate-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </>
  );
}

// Global scope check for React
if (!window.createRoot) {
  window.createRoot = createRoot;
}

function injectObserver() {
  if (!document.getElementById('remma-extension-root')) {
    const rootEl = document.createElement('div');
    rootEl.id = 'remma-extension-root';
    document.body.appendChild(rootEl);
    
    const root = createRoot(rootEl);
    root.render(<RemmaExtension />);
  }
}

// YouTube is SPA, so we need to stay alive
const observer = new MutationObserver(() => {
  if (!document.getElementById('remma-extension-root')) {
    injectObserver();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
injectObserver();

export default RemmaExtension;
