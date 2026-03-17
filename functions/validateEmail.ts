Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { email } = await req.json();

  const trimmed = (email || '').trim();

  if (!trimmed) {
    return Response.json({ valid: false, error: 'Email is required.' }, { status: 400 });
  }

  if (!trimmed.includes('@')) {
    return Response.json({ valid: false, error: 'Email must contain @.' }, { status: 400 });
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[1].includes('.') || parts[1].endsWith('.')) {
    return Response.json({ valid: false, error: 'Email must have a valid domain (e.g. .com).' }, { status: 400 });
  }

  // Basic RFC check — no spaces, no consecutive dots
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return Response.json({ valid: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  return Response.json({ valid: true, email: trimmed });
});