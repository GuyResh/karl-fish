export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test basic functionality
    console.log('Test API called');
    console.log('Environment variables:');
    console.log('SMTP_SERVER:', process.env.SMTP_SERVER);
    console.log('SMTP_USERNAME:', process.env.SMTP_USERNAME);
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET');

    return res.status(200).json({ 
      success: true, 
      message: 'Test API working',
      env: {
        smtpServer: process.env.SMTP_SERVER,
        smtpUsername: process.env.SMTP_USERNAME,
        smtpPasswordSet: !!process.env.SMTP_PASSWORD
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({ 
      error: 'Test API failed',
      details: error.message 
    });
  }
}
