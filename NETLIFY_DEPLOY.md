# Deploying to Netlify

Netlify is a great alternative to GitHub Pages, especially if you're having file size issues.

## Option 1: Drag & Drop (Easiest - No GitHub needed!)

1. **Build the project locally** (if you have Node.js working):
   ```bash
   npm install
   npm run build
   ```

2. **Go to [Netlify Drop](https://app.netlify.com/drop)** (or drag & drop in Netlify dashboard)

3. **Drag the entire `dist` folder** onto the Netlify Drop zone

4. **Your game will be live immediately!** Netlify will give you a URL like `https://random-name-123.netlify.app`

## Option 2: Connect to GitHub (Automatic builds)

1. **Push your code to GitHub** (even if it's just the source, without large assets)

2. **Go to [Netlify](https://app.netlify.com)** and sign up/login

3. **Click "Add new site" → "Import an existing project"**

4. **Connect to GitHub** and select your `ART_TAPE_VOL3_GAME` repository

5. **Configure build settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** (leave empty)

6. **Add environment variable** (optional, but recommended):
   - **Key:** `NETLIFY`
   - **Value:** `true`
   
   This ensures the build uses the correct base path (`/` instead of `/ART_TAPE_VOL3_GAME/`)

7. **Click "Deploy site"**

8. **Netlify will automatically build and deploy!** Every time you push to your main branch, it will rebuild automatically.

## Option 3: Netlify CLI (For advanced users)

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

## Notes

- **File size limits:** Netlify has a 100MB limit per file, but no total repo size limit (unlike GitHub)
- **Custom domain:** You can add a custom domain in Netlify settings
- **HTTPS:** Automatically enabled
- **Build logs:** Available in the Netlify dashboard

## Troubleshooting

If assets don't load:
- Make sure the `netlify.toml` file is in your repo
- Check that `NETLIFY=true` environment variable is set (if using GitHub integration)
- Verify the build output in Netlify's build logs
