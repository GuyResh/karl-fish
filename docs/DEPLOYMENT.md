# Karl Fish - Deployment Guide

## 🚀 Full-Stack Deployment with Vercel + Supabase

This guide covers deploying the complete Karl Fish application with web app, Android app, and cloud sharing features.

## 📋 Prerequisites

1. **Supabase Account** - [supabase.com](https://supabase.com)
2. **Vercel Account** - [vercel.com](https://vercel.com)
3. **GitHub Account** - [github.com](https://github.com)
4. **Android Studio** (for Android builds)

## 🗄️ Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region close to your users
3. Set a strong database password
4. Wait for the project to be created

### 1.2 Configure Database
1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create all tables, policies, and functions

### 1.3 Get API Keys
1. Go to Settings > API in your Supabase dashboard
2. Copy the Project URL and anon public key
3. Save these for environment variables

## 🌐 Step 2: Vercel Deployment

### 2.1 Prepare Repository
1. Push your code to GitHub
2. Ensure all files are committed and pushed

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Choose "Next.js" as the framework (Vercel will auto-detect React)
3. Set the following environment variables:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_APP_NAME=Karl Fish
   VITE_APP_VERSION=1.0.0
   ```

### 2.3 Configure Build Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 📱 Step 3: Android App Build

### 3.1 Install Android Dependencies
```bash
# Install Android Studio and SDK
# Set ANDROID_HOME environment variable

# Install Tauri mobile dependencies
npm install -g @tauri-apps/cli
cargo install tauri-cli
```

### 3.2 Configure Android Build
```bash
# Initialize Android project
npx tauri android init

# Build Android APK
npx tauri android build
```

### 3.3 Deploy to Google Play Store
1. Create a Google Play Console account
2. Create a new app listing
3. Upload the signed APK
4. Complete store listing and publish

## 🔧 Step 4: Environment Configuration

### 4.1 Local Development
Create `.env.local` file:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_NAME=Karl Fish
VITE_APP_VERSION=1.0.0
```

### 4.2 Production Environment
Set these in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`
- `VITE_APP_VERSION`

## 🚀 Step 5: Testing Deployment

### 5.1 Web App Testing
1. Visit your Vercel URL
2. Test user registration/login
3. Test friend system
4. Test session sharing
5. Test all features

### 5.2 Android App Testing
1. Install APK on Android device
2. Test all features on mobile
3. Test GPS and camera permissions
4. Test offline functionality

## 📊 Step 6: Monitoring & Analytics

### 6.1 Supabase Monitoring
- Monitor database usage in Supabase dashboard
- Set up alerts for high usage
- Monitor authentication metrics

### 6.2 Vercel Analytics
- Enable Vercel Analytics
- Monitor web app performance
- Track user engagement

## 🔒 Step 7: Security Considerations

### 7.1 Database Security
- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Friend relationships are properly secured

### 7.2 API Security
- Supabase handles authentication
- JWT tokens are used for API calls
- CORS is configured for your domain

### 7.3 Mobile Security
- Android permissions are minimal and necessary
- Data is encrypted in transit
- Local data is stored securely

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Ensure all dependencies are installed
   - Check TypeScript errors

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Ensure user is authenticated

3. **Android Build Issues**
   - Check Android SDK installation
   - Verify Tauri configuration
   - Check permissions in manifest

4. **Sharing Not Working**
   - Check friend relationships
   - Verify privacy settings
   - Check database permissions

## 📈 Scaling Considerations

### Database Scaling
- Supabase free tier: 500MB database, 2GB bandwidth
- Upgrade to Pro for more capacity
- Consider database optimization

### App Scaling
- Vercel free tier: 100GB bandwidth
- Upgrade for more capacity
- Consider CDN for global users

### Mobile Scaling
- Google Play Store handles distribution
- Consider app store optimization
- Monitor crash reports and user feedback

## 🎯 Next Steps

1. **User Feedback**: Collect and implement user feedback
2. **Feature Updates**: Add new features based on usage
3. **Performance Optimization**: Monitor and optimize performance
4. **Marketing**: Promote the app to fishing communities
5. **Analytics**: Track usage patterns and user behavior

## 📞 Support

For deployment issues:
- Check Vercel documentation
- Check Supabase documentation
- Check Tauri mobile documentation
- Create GitHub issues for bugs

---

**Happy Fishing! 🎣**
