import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { kv } from '@vercel/kv';
import WaitlistEmail from '@/components/WaitlistEmail';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // 1. Store in Vercel KV Database (Permanent Storage)
    if (process.env.KV_REST_API_URL) {
      const timestamp = new Date().toISOString();
      const isNew = await kv.sadd('waitlist_members', email); 
      
      if (isNew) {
        await kv.set(`waitlist:${email}`, timestamp);
        await kv.incr('total_waitlist_members');
      }
    } else {
      console.log('KV not configured, logging email to console:', email);
    }

    // 2. Send Professional Confirmation Email via Resend
    // We only do this if the RESEND_API_KEY is configured
    if (process.env.RESEND_API_KEY) {
      const { data, error } = await resend.emails.send({
        from: 'Remma AI <onboarding@resend.dev>', // Becomes hello@remma.ai once domain is verified
        to: email,
        subject: "You're on the list! 🎉 | Remma AI",
        react: WaitlistEmail({ email }),
      });

      if (error) {
        console.error('Resend error:', error);
      }
    } else {
      console.log('Resend not configured, skipping email notification.');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Waitlist process error:', err);
    return NextResponse.json({ error: 'Failed to join waitlist. Please try again.' }, { status: 500 });
  }
}
