// Vercel API endpoint for sharing sessions
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionData, privacyLevel, specificFriendIds } = req.body;

  if (!sessionData) {
    return res.status(400).json({ error: 'Session data is required' });
  }

  try {
    // This would typically save to Supabase
    // For now, return success (actual implementation would go here)
    return res.status(200).json({ 
      message: 'Session shared successfully',
      data: { 
        id: 'temp-id',
        privacyLevel,
        specificFriendIds: specificFriendIds || []
      }
    });
  } catch (error) {
    console.error('Share session error:', error);
    return res.status(500).json({ error: 'Failed to share session' });
  }
}
