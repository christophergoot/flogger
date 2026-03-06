# Flogger

**Accountability hurts.**

A simple web app for logging activities (name + duration in minutes). Each user signs in with Google; their data is stored in a spreadsheet in **their own Google Drive**. Built for speed: quick entry with optional end time/date for backfilling past entries. Deploys as a static site to GitHub Pages.

## Stack

- **Front end:** Vite + React + TypeScript
- **Back end:** Google (Sign-In + Sheets API + Drive API) — no server; the user's sheet lives in their Google account

## Setup

### 1. Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Enable **Google Sheets API** and **Google Drive API**: APIs & Services → Library → search for each → Enable.
3. Create OAuth credentials: **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Add **Authorized JavaScript origins** (e.g. `http://localhost:5173`, `https://yourusername.github.io`).
   - Add **Authorized redirect URIs** if required (e.g. `http://localhost:5173` for dev).
4. Copy the **Client ID** (e.g. `xxx.apps.googleusercontent.com`).

### 2. Local development

```bash
cp .env.example .env
# Edit .env and set VITE_GOOGLE_CLIENT_ID

yarn install
yarn dev
```

Open http://localhost:5173, click **Sign in with Google**, and approve the requested scopes (email, Sheets, Drive file creation). On first sign-in a spreadsheet named **Flogger** is created in the user's Drive and used from then on.

### 3. GitHub Pages deployment

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages** → Source: **GitHub Actions**.
3. Add a repository secret: **Settings → Secrets and variables → Actions** → New repository secret:
   - Name: `VITE_GOOGLE_CLIENT_ID`
   - Value: your Google OAuth Client ID
4. Add your GitHub Pages origin to the OAuth client's **Authorized JavaScript origins** (e.g. `https://yourusername.github.io` or `https://yourusername.github.io/flogger` for project site).
5. Push to `main`; the workflow will build and deploy.

The app will be at `https://<username>.github.io/flogger/`. If your repo name is different, set `base` in `vite.config.ts` to match (e.g. `base: '/your-repo-name/'`).

## How it works

- **Sign-in:** Google Sign-In (OAuth) with scopes for email, Sheets, and Drive file creation.
- **Sheet per user (single source of truth):** On sign-in, the app looks in the user's Google Drive for an existing spreadsheet named **Flogger**. If found, that sheet is used; otherwise a new one is created. All devices using the same Google account therefore share one spreadsheet. The sheet ID is cached in `localStorage` per device for speed.
- **Data:** Rows are written to and read from that sheet via the Sheets API (append, read, delete row). Columns: `id`, `name`, `duration_minutes`, `end_time`, `created_at`.

## Features

- **Quick log:** Activity name + duration (minutes); submit with one click.
- **Optional end time:** "Set end time (backfill)" lets you add a date and time for past entries.
- **List:** Recent activities with created time; entries with an end time show "ended …".
- **Delete:** Remove an entry from the list (and from the sheet).
- **Your data:** The spreadsheet is in the user's Google account; they can open it in Sheets anytime.
