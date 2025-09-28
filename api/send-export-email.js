const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { userEmail, format = 'csv', sessionData } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    if (!sessionData || !Array.isArray(sessionData)) {
      return res.status(400).json({ error: 'Session data is required' });
    }

    // Create SMTP transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_SERVER,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Generate CSV or JSON data
    let fileContent;
    let fileName;
    let mimeType;

    if (format === 'json') {
      fileContent = JSON.stringify(sessionData, null, 2);
      fileName = `karl-fish-export-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // Generate CSV
      if (sessionData.length === 0) {
        fileContent = 'No sessions found';
      } else {
        // Get all unique keys from all sessions
        const allKeys = new Set();
        sessionData.forEach(session => {
          Object.keys(session).forEach(key => allKeys.add(key));
        });

        const headers = Array.from(allKeys);
        
        // Create CSV content
        const csvRows = [headers.join(',')];
        
        sessionData.forEach(session => {
          const row = headers.map(header => {
            const value = session[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value).replace(/"/g, '""'); // Escape quotes
          });
          csvRows.push(`"${row.join('","')}"`);
        });
        
        fileContent = csvRows.join('\n');
      }
      fileName = `karl-fish-export-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    // Email content
    const subject = `Karl Fish Export - ${sessionData.length} sessions`;
    const text = `Your fishing session export is attached.\n\nSessions: ${sessionData.length}\nFormat: ${format.toUpperCase()}\nGenerated: ${new Date().toLocaleString()}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🎣 Karl Fish Export</h2>
        <p>Your fishing session export is attached to this email.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Sessions:</strong> ${sessionData.length}</p>
          <p><strong>Format:</strong> ${format.toUpperCase()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          This export was generated from your Karl Fish fishing log application.
        </p>
      </div>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USERNAME,
      to: userEmail,
      subject: subject,
      text: text,
      html: html,
      attachments: [
        {
          filename: fileName,
          content: fileContent,
          contentType: mimeType,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true, 
      message: 'Export email sent successfully',
      sessionsCount: sessionData.length,
      format: format
    });

  } catch (error) {
    console.error('Error sending export email:', error);
    res.status(500).json({ 
      error: 'Failed to send export email',
      details: error.message 
    });
  }
}
