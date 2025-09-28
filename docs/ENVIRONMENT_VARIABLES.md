# Environment Variables

## Required Environment Variables

### Supabase Configuration
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### SMTP Configuration for Email Exports
```bash
SMTP_SERVER=smtp.gmx.com
SMTP_PORT=587
SMTP_USERNAME=karlfish@gmx.com
SMTP_PASSWORD=your_gmx_password
SMTP_FROM=karlfish@gmx.com
```

### Base Path Configuration (for deployment)
```bash
VITE_BASE_PATH=/
```

## Setting Up Environment Variables

### For Local Development
1. Create a `.env.local` file in the project root
2. Copy the variables above and fill in your actual values
3. Restart your development server

### For Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with its value
4. Redeploy your application

### For GitHub Pages Deployment
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add each variable as a repository secret
4. The GitHub Actions workflow will use these secrets

## SMTP Configuration Details

### GMX.com SMTP Settings
- **Server**: smtp.gmx.com
- **Port**: 587 (TLS) or 465 (SSL)
- **Security**: STARTTLS or SSL
- **Authentication**: Required

### Alternative SMTP Providers
You can use any SMTP provider by updating the environment variables:
- Gmail: smtp.gmail.com:587
- Outlook: smtp-mail.outlook.com:587
- SendGrid: smtp.sendgrid.net:587
- Mailgun: smtp.mailgun.org:587
