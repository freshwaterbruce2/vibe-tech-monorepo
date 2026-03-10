# GitHub Repository Setup Instructions

## Step 1: Create GitHub Repository

1. Go to <https://github.com/new>
2. Repository name: `vibe-booking-platform`
3. Description: "AI-powered hotel booking platform with Square payments - 5% commission"
4. **Make it Public** (required for Vercel free tier)
5. **Don't** initialize with README/gitignore (we have files already)
6. Click "Create repository"

## Step 2: Connect Local Project to GitHub

After creating the repo, run these commands in your terminal:

```bash
# Add the GitHub repository as remote origin
git remote add origin https://github.com/YOUR_USERNAME/vibe-booking-platform.git

# Push your existing code to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Verify Upload

- Go to your GitHub repository page
- You should see all your project files
- Check that the latest commit matches your local commit

## Step 4: Deploy to Vercel

1. Go to <https://vercel.com/dashboard>
2. Click "Add New..." → "Project"
3. Import from GitHub
4. Select your `vibe-booking-platform` repository
5. Configure these environment variables:
   - `VITE_API_URL=https://your-backend-url.railway.app`
   - `VITE_SQUARE_APPLICATION_ID=your_square_app_id`
   - `VITE_SQUARE_LOCATION_ID=your_square_location_id`
6. Click "Deploy"

## Alternative: Upload Build Folder

If GitHub setup fails, you can:

1. Zip the `dist` folder from your build
2. Drag and drop it directly to Vercel dashboard
3. This deploys immediately but won't auto-update from Git

## Next Steps After GitHub Setup

- Repository will be publicly visible
- Vercel can auto-deploy on every push
- Ready for Railway backend deployment
- Can share project with others easily
