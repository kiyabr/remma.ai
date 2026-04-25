# 🚀 Remma AI — Unlimited YouTube Summarizer

**Get instant, high-insight summaries of any YouTube video directly in your browser.**

Remma AI is a privacy-first, "unlimited" YouTube summarization tool. It combines high-power cloud AI (Groq/Gemini) with a local browser fallback (Transformers.js) to ensure you can summarize videos forever, for free, even when API limits are reached.

![Remma AI Logo](web/app/icon.svg)

## ✨ Features

- ⚡ **Instant Summaries**: Get the core value of a 20-minute video in 10 seconds.
- 💡 **Main Takeaways**: Key lessons and conclusions highlighted with smart formatting.
- ♾️ **Unlimited Local AI**: When cloud quotas are full, Remma switches to a local AI engine running directly in your browser.
- 🔒 **Privacy First**: Summaries can be processed locally on your device.
- 🧩 **Browser Extension**: A professional extension that lives right on your YouTube page.

## 🛠️ Tech Stack

- **Frontend/API**: Next.js 15+ (App Router)
- **AI (Cloud)**: Groq (Llama 3.1) & Google Gemini 1.5
- **AI (Local)**: Transformers.js (T5-Small)
- **Styling**: Vanilla CSS / Modern Glassmorphism

## 🚀 Quick Start

### 1. Web App
```bash
cd web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 2. Browser Extension
1. `cd extension && npm install && npm run build`
2. Open Chrome -> `chrome://extensions`
3. Enable "Developer mode" and click "Load unpacked"
4. Select the `extension/dist` folder.

## 🔑 Environment Variables

To run the cloud AI, add these to your `web/.env.local`:
```env
GROQ_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

## ⭐ Support the Project
If you find Remma AI useful, please give it a star! It helps us know people are interested in the project.

## 📄 License
MIT License - see [LICENSE](LICENSE) for details.
