import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ATTEMPTS_KEY_PREFIX = 'login_attempt:';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory store (resets on cold start, but sufficient for rate limiting)
const attemptStore = new Map();

function getKey(email, ip) {
  return `${ATTEMPTS_KEY_PREFIX}${email?.toLowerCase()?.trim()}:${ip}`;
}

function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { action, email } = body;
  const ip = getClientIp(req);
  const key = getKey(email, ip);
  const now = Date.now();

  if (action === 'check') {
    const record = attemptStore.get(key);

    if (record && record.lockedUntil && now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      console.log(`[RateLimit] BLOCKED — email: ${email}, ip: ${ip}, remaining: ${remainingMins}m`);
      return Response.json({
        allowed: false,
        message: 'Too many attempts, please try again later.',
        remainingMinutes: remainingMins,
      });
    }

    return Response.json({ allowed: true });
  }

  if (action === 'failed') {
    const record = attemptStore.get(key) || { count: 0, lockedUntil: null };

    // Reset if lockout has expired
    if (record.lockedUntil && now >= record.lockedUntil) {
      record.count = 0;
      record.lockedUntil = null;
    }

    record.count += 1;
    console.log(`[RateLimit] Failed attempt — email: ${email}, ip: ${ip}, count: ${record.count}`);

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      console.log(`[RateLimit] LOCKED OUT — email: ${email}, ip: ${ip}, until: ${new Date(record.lockedUntil).toISOString()}`);
      attemptStore.set(key, record);
      return Response.json({
        locked: true,
        message: 'Too many attempts, please try again later.',
      });
    }

    attemptStore.set(key, record);
    return Response.json({ locked: false, attemptsRemaining: MAX_ATTEMPTS - record.count });
  }

  if (action === 'success') {
    // Clear attempts on successful login
    attemptStore.delete(key);
    console.log(`[RateLimit] Success — cleared attempts for email: ${email}, ip: ${ip}`);
    return Response.json({ cleared: true });
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 });
});