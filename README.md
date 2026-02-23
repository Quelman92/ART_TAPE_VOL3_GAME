# Art Tape Vol. 3

A block puzzle game designed to be opened on **phones via NFC tag**. Play in **Arcade** mode (play until you drop) or **Art Tape** story mode with unlockable tracks. *(Inspired by Lumines.)*

---

## GitHub-ready

- **Clone and run**
  ```bash
  git clone <your-repo-url>
  cd ART_TAPE_VOL3_GAME
  npm install
  npm run dev
  ```
- **No secrets in repo** — `.gitignore` excludes `node_modules/`, `dist/`, `.env`, and editor/OS files.
- **Deploy from source** — Use the included GitHub Actions workflow (see [Deploy to GitHub Pages](#deploy-to-github-pages)) to build and publish on every push.

---

## Run locally

```bash
npm install
npm run dev
```

Open **http://localhost:5173/** in your browser (or Cursor Simple Browser).

---

## Build for deployment

```bash
npm run build
```

Output is in the **`dist/`** folder. Deploy the **contents of `dist/`** to your host (e.g. GitHub Pages, Netlify, Vercel).

---

## Deploy to GitHub Pages

**If you see a 404 for `main.ts` or a blank page:** GitHub Pages must serve the **built** app (the `dist/` output), not the source. The source `index.html` points to `/src/main.ts`, which only exists in development. Use **GitHub Actions** (below) so the deployed site uses the built JS from `dist/`.

1. Create a repo and push this project (without `node_modules/` or `dist/` — they're in `.gitignore`).
2. In **vite.config.ts**, set `repoName` to your GitHub repo name (e.g. if the repo is `my-game`, use `'my-game'`). The site URL will be `https://<user>.github.io/<repoName>/`.
3. **Option A — GitHub Actions (recommended)**  
   - In the repo: **Settings → Pages → Build and deployment**: Source = **GitHub Actions**.  
   - Push to `main`. The workflow builds the app and deploys the `dist/` folder. The game will load at `https://<user>.github.io/<repo-name>/`.
4. **Option B — Manual**  
   - Run `npm run build`, then push the **contents** of the `dist/` folder to a branch (e.g. `gh-pages`) and set that branch in **Settings → Pages**. Do not set Pages to serve the root of `main` — that serves source files and causes the main.ts 404.

---

## Game works but no art / assets too big

Your **`public/`** folder (images, video, audio) is **~1.1 GB**. The main game repo can’t hold that, so the live site has no art. Use a **second GitHub repo** as your “public folder” and point the game at it.

### Use a second GitHub repo as the asset folder (drag-and-drop)

1. **Create a new repo** (same account as the game).  
   - Name it e.g. **`ART_TAPE_VOL3_ASSETS`** (or anything you like).  
   - Public, no README/license needed. Create the repo.

2. **Upload the contents of `public`**  
   - Open the new repo on GitHub.  
   - Click **“Add file” → “Upload files”**.  
   - Drag **everything inside** your `public` folder (the `assets` folder, `game` folder, etc.) into the upload area — or drag the whole `public` folder; GitHub will upload its contents.  
   - If you have many files, you can do it in batches (e.g. upload `assets` first, then `game`, etc.).  
   - Commit (e.g. “Add assets”).  
   - **Note:** GitHub rejects any **single file over 100 MB**. If something fails, compress or split that file (e.g. re-encode a large video at a smaller size) and try again.

3. **Turn on GitHub Pages for the assets repo**  
   - In **that repo**: **Settings → Pages**.  
   - Under **Build and deployment**, set **Source** to **“Deploy from a branch”**.  
   - Branch: **main** (or **master**), folder: **/ (root)**. Save.  
   - After a minute, the site will be at **`https://<your-username>.github.io/ART_TAPE_VOL3_ASSETS/`** (use your actual repo name).

4. **Point the game at that URL**  
   - In your **game repo** (ART_TAPE_VOL3_GAME): **Settings → Secrets and variables → Actions**.  
   - **New repository secret**: name = **`ASSETS_BASE_URL`**, value = **`https://<your-username>.github.io/ART_TAPE_VOL3_ASSETS/`** (trailing slash, use your real username and repo name).

5. **Redeploy the game**  
   - In the game repo: **Actions → Deploy to GitHub Pages → Run workflow** (or push a small change).  
   - When the run finishes, reload the game; art will load from the assets repo.

---

## Responsive / mobile & tablet

The game is **responsive and scalable** across phones and tablets:

- **Single design size (480×800)** with **scale mode FIT** — the game letterboxes on any aspect ratio (portrait/landscape, narrow phones, wide tablets) so layout and touch targets stay consistent.
- **Resize & orientation** — Canvas refreshes on window resize and device rotation so it always fits the viewport.
- **Touch-friendly** — Full-screen feel, no accidental zoom; touch controls and safe-area insets respect notches and home indicators.
- **Viewport** — `viewport-fit=cover` and theme color for a native-like experience when added to home screen.

Test on real devices or Chrome DevTools device mode.

---

## NFC tag

After the game is live, use the **exact URL** of the deployed app (e.g. `https://username.github.io/my-repo-name/`) when writing your NFC tag so anyone who taps it opens the game on their phone.

---

## Sharing / Airdrop

Copy the whole **ART_TAPE_VOL3_GAME** folder. On the other machine run `npm install` then `npm run build` when you're ready to deploy. You can delete the `dist/` folder before sharing; it will be recreated by `npm run build`.
