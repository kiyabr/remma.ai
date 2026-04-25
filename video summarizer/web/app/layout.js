import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Remma AI | Free AI YouTube Summarizer | 10x Your Learning",
  description: "Stop wasting time on long videos. Get instant, accurate, and professional summaries of any YouTube video. No cost, privacy-first, and lightning fast.",
  openGraph: {
    title: "Remma AI - Understand Videos Instantly",
    description: "Get structured insights, key points, and main takeaways from any YouTube video in seconds.",
    url: "https://remma.ai",
    siteName: "Remma AI",
    images: [
      {
        url: "/og-image.png", // User will need to add this image to /public
        width: 1200,
        height: 630,
        alt: "Remma AI Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Remma AI | Free YouTube Summarizer",
    description: "Watch 20m videos in 20 seconds. Structured summaries for researchers and creators.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
