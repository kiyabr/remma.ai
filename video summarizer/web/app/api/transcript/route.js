import { NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('url');

  if (!videoId) {
    return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return NextResponse.json({ transcript }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript. The video might not have captions enabled or is restricted.' }, { status: 500 });
  }
}
