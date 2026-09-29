# Winter Is Coming

A personal habit tracker built with Next.js, TypeScript, MongoDB, secure cookie sessions, and optional Cloudinary photo uploads.

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies with `pnpm install` (or `npm install`).
3. Copy `.env.example` to `.env.local`, replace the placeholders with your MongoDB connection string and a private random `SESSION_SECRET` (at least 32 characters), then restart the dev server.
4. Start the app with `pnpm dev` and open http://localhost:3000.

Cloudinary settings are only needed for profile photo uploads. Without them, the rest of the app works and shows initials in place of a photo.

## Deploy to Vercel

Import this repository in Vercel, configure the same environment variables, allow the Vercel deployment to connect to your MongoDB Atlas cluster, and deploy. Keep all secrets in Vercel project settings; never add them to source control.
