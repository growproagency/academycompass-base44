Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ valid: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const password = body?.password;

  // Never log or expose the password value
  if (!password) {
    return Response.json({ valid: false, error: 'Password is required.' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ valid: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  if (/<[^>]*>|<\/[^>]*>/i.test(password)) {
    return Response.json({ valid: false, error: 'Password contains invalid characters.' }, { status: 400 });
  }

  return Response.json({ valid: true });
});