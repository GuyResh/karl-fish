// Vercel API endpoint for user registration
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, username, initials } = req.body;

  if (!email || !password || !username || !initials) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // This would typically call Supabase Auth
    // For now, return success (actual implementation would go here)
    return res.status(200).json({ 
      message: 'Registration endpoint ready',
      data: { email, username, initials }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
}
