# Complete Step-by-Step Deployment Guide
## From Zero to Live Game on Netlify

---

## PART 1: Prepare Your Code for GitHub

### Step 1: Check What You Have
Your project should have these files/folders:
- ✅ `src/` folder (your game code)
- ✅ `public/` folder (your assets - images, audio, etc.)
- ✅ `package.json`
- ✅ `vite.config.ts`
- ✅ `tsconfig.json`
- ✅ `index.html`
- ✅ `netlify.toml` (I just created this)
- ✅ `.github/workflows/deploy.yml` (for GitHub Pages, optional)

### Step 2: Check Your .gitignore File
Make sure your `.gitignore` file includes:
```
node_modules/
dist/
build/
.DS_Store
.env
.env.local
```

This ensures you don't upload huge folders or build files to GitHub.

### Step 3: Remove Unnecessary Folders (Optional but Recommended)
If you still have these, you can delete them (they'll be regenerated):
- `node_modules/` (if it exists)
- `dist/` (if it exists - Netlify will build it)
- `lumines-game/` (old unused folder)

**Note:** Don't delete `public/` - that has your game assets!

---

## PART 2: Set Up GitHub Repository

### Step 4: Create a GitHub Account (If You Don't Have One)
1. Go to https://github.com
2. Click "Sign up" in the top right
3. Follow the prompts to create your account
4. Verify your email if needed

### Step 5: Create a New Repository on GitHub
1. Once logged in, click the **"+"** icon in the top right
2. Select **"New repository"**
3. Fill in:
   - **Repository name:** `ART_TAPE_VOL3_GAME` (or whatever you want)
   - **Description:** (optional) "Art Tape Vol. 3 Game"
   - **Visibility:** Choose **Public** (free) or **Private** (if you have a paid account)
   - **DO NOT** check "Add a README file" (you already have one)
   - **DO NOT** add .gitignore or license (you already have them)
4. Click **"Create repository"**

### Step 6: Initialize Git in Your Project (If Not Already Done)
Open Terminal (on Mac: Applications → Utilities → Terminal) and run:

```bash
cd /Users/macbo/Desktop/ART_TAPE_VOL3_GAME
```

Check if git is already initialized:
```bash
git status
```

If you see "not a git repository", initialize it:
```bash
git init
```

### Step 7: Add All Files to Git
```bash
git add .
```

This adds all your files (respecting .gitignore).

### Step 8: Make Your First Commit
```bash
git commit -m "Initial commit - Art Tape Vol. 3 game"
```

### Step 9: Connect to GitHub Repository
GitHub will show you commands after creating the repo. Use these (replace YOUR_USERNAME with your actual GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/ART_TAPE_VOL3_GAME.git
git branch -M main
git push -u origin main
```

**If you get an authentication error:**
- GitHub no longer accepts passwords. You need a Personal Access Token:
  1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
  2. Click "Generate new token (classic)"
  3. Give it a name like "Netlify Deploy"
  4. Check "repo" scope (full control)
  5. Click "Generate token"
  6. Copy the token (you won't see it again!)
  7. When git asks for password, paste the token instead

---

## PART 3: Set Up Netlify

### Step 10: Create Netlify Account
1. Go to https://app.netlify.com
2. Click **"Sign up"**
3. Choose **"Sign up with GitHub"** (easiest option)
4. Authorize Netlify to access your GitHub account
5. Complete the signup process

### Step 11: Add Your Site to Netlify
1. Once logged into Netlify, click **"Add new site"** button
2. Select **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify if prompted
5. You'll see a list of your GitHub repositories
6. Find and click on **"ART_TAPE_VOL3_GAME"** (or whatever you named it)

### Step 12: Configure Build Settings
Netlify should auto-detect settings from `netlify.toml`, but verify:

1. **Build command:** Should show `npm run build`
   - If it's blank, type: `npm run build`
   
2. **Publish directory:** Should show `dist`
   - If it's blank, type: `dist`

3. **Base directory:** Leave this **empty**

4. Click **"Show advanced"** to add environment variables:
   - Click **"New variable"**
   - **Key:** `NETLIFY`
   - **Value:** `true`
   - Click **"Add variable"**

### Step 13: Deploy!
1. Click the big green **"Deploy site"** button
2. Netlify will start building your site
3. You'll see build logs in real-time
4. Wait for it to finish (usually 2-5 minutes)

### Step 14: Your Site is Live!
Once the build completes:
1. You'll see a green "Published" status
2. Netlify will give you a URL like: `https://random-name-123.netlify.app`
3. Click the URL to see your game live!

---

## PART 4: Future Updates

### Step 15: Making Changes and Re-deploying
Whenever you make changes to your code:

1. **Make your changes** in your code editor
2. **Save all files**
3. **Commit your changes:**
   ```bash
   cd /Users/macbo/Desktop/ART_TAPE_VOL3_GAME
   git add .
   git commit -m "Description of your changes"
   git push
   ```
4. **Netlify will automatically rebuild!**
   - Go to your Netlify dashboard
   - You'll see a new deploy starting automatically
   - Wait for it to finish
   - Your changes will be live!

---

## TROUBLESHOOTING

### Problem: Build Fails on Netlify
**Solution:**
- Check the build logs in Netlify dashboard
- Common issues:
  - Missing dependencies → Make sure `package.json` has all dependencies
  - TypeScript errors → Fix any errors in your code
  - File path issues → Check that all asset paths are correct

### Problem: Assets Don't Load
**Solution:**
- Make sure `public/` folder is in your GitHub repo
- Check that `ASSET_BASE` in `constants.ts` is working correctly
- Verify the `netlify.toml` redirects are correct

### Problem: Audio Doesn't Play
**Solution:**
- The updated code should handle this, but browsers block autoplay
- Users may need to click/tap once to start audio
- Check browser console for errors

### Problem: GitHub File Size Errors
**Solution:**
- If individual files are too large (>100MB), you may need to:
  - Compress large video/audio files
  - Or use a CDN for large assets
  - Or use Netlify's Large Media feature

---

## QUICK REFERENCE

**GitHub Repository:** https://github.com/YOUR_USERNAME/ART_TAPE_VOL3_GAME

**Netlify Dashboard:** https://app.netlify.com

**Your Live Site:** (Check Netlify dashboard after deployment)

---

## SUMMARY CHECKLIST

- [ ] Code is ready (all files saved)
- [ ] GitHub account created
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Netlify account created
- [ ] Netlify connected to GitHub
- [ ] Build settings configured
- [ ] Environment variable `NETLIFY=true` added
- [ ] Site deployed successfully
- [ ] Game is live and working!

---

**Need Help?** If you get stuck at any step, let me know exactly where and what error message you see!
