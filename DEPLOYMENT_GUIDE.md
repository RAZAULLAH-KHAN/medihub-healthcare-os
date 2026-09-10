# MediHub Healthcare OS — Deployment Guide

This guide details how to push the codebase to your GitHub repository and deploy the full-stack Next.js application to **Vercel**.

---

## Part 1: Push Code to GitHub

The repository is already committed locally and configured to your remote repository:  
**`https://github.com/RAZAULLAH-KHAN/medihub-healthcare-os.git`**

### Step 1: Open your terminal in this directory
Run the following command in PowerShell, Git Bash, or Command Prompt:

```bash
git push -u origin main
```

### Authentication Notes:
- When prompted by **Git Credential Manager**, select **"Sign in with your browser"** and authorize your GitHub account (`RAZAULLAH-KHAN`).
- Alternatively, if you use a **Personal Access Token (PAT)**:
  ```bash
  git push https://<YOUR_GITHUB_TOKEN>@github.com/RAZAULLAH-KHAN/medihub-healthcare-os.git main
  ```

---

## Part 2: Deploy to Vercel (Recommended: Via Vercel Dashboard)

Deploying via the Vercel Dashboard connects your GitHub repository so every new commit is automatically built and deployed.

### Step 1: Import Project in Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** > **"Project"**.
3. Under **"Import Git Repository"**, locate and select:  
   **`RAZAULLAH-KHAN/medihub-healthcare-os`**
4. Click **"Import"**.

### Step 2: Configure Project Settings (CRITICAL)
In the Project Configuration screen:

1. **Framework Preset**: `Next.js` (automatically detected).
2. **Root Directory**: Click **"Edit"** and select **`web`**  
   *(Since the Next.js application is located in the `web` subfolder, setting the Root Directory to `web` is essential).*
3. **Build Command**: Leave default (`npm run build`).
4. **Output Directory**: Leave default (`.next`).

### Step 3: Add Environment Variables
Expand the **"Environment Variables"** section and copy the keys from your `web/.env.local`:

| Variable Name | Description | Example / Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Required for server actions & admin operations |
| `AI_PROVIDER` | AI Provider for triage | `gemini` |
| `AI_API_KEY` | Gemini API Key | Your Google Gemini API Key |
| `GEMINI_MODEL` | Gemini Model identifier | `gemini-2.0-flash` |
| `CRON_SECRET` | Secret token for automated queue/reminder crons | Any secure random string |
| `NEXT_PUBLIC_SITE_URL` | Your production Vercel URL | `https://medihub-healthcare-os.vercel.app` (update after initial deploy) |

### Step 4: Click "Deploy"
Vercel will compile TypeScript, bundle Next.js Turbopack assets, generate all static pages, and produce your live production URL (e.g. `https://medihub-healthcare-os.vercel.app`).

---

## Part 3: Configure Supabase Auth Redirects

To ensure auth links (email confirmations, magic links, password resets) work seamlessly on your live Vercel domain:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **Authentication** > **URL Configuration**.
3. Under **Site URL**, set:
   ```
   https://<your-vercel-app-name>.vercel.app
   ```
4. Under **Redirect URLs**, add:
   ```
   https://<your-vercel-app-name>.vercel.app/**
   https://<your-vercel-app-name>.vercel.app/auth/callback
   ```
5. Click **Save**.

---

## Alternative: Deploy via Vercel CLI

If you prefer deploying directly from your command line:

```bash
# 1. Navigate to the web folder
cd web

# 2. Login to Vercel
npx vercel login

# 3. Deploy to production
npx vercel --prod
```
During the prompt:
- Link to existing project? `N`
- What's your project's name? `medihub-healthcare-os`
- In which directory is your code located? `./` (since you are inside `web`)
- Want to modify settings? Add environment variables when prompted.
