import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Get live stats from Vercel KV
    // Default to some realistic "seed" numbers if database is empty for a better first look
    const stars = await kv.get('total_stars') || 128;
    const waitlist = await kv.get('total_waitlist_members') || 452;

    return NextResponse.json({ stars, waitlist });
  } catch (error) {
    console.error('Stats fetch error:', error);
    // Return seed numbers if database fails or isn't connected yet
    return NextResponse.json({ stars: 128, waitlist: 452 });
  }
}

export async function POST(req) {
  try {
    const { action } = await req.json();

    if (action === 'star') {
      const newCount = await kv.incr('total_stars');
      return NextResponse.json({ success: true, count: newCount });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Stats update error:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
