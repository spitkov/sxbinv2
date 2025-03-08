# sxbin.gay - Simple File Uploads

A modern, secure file sharing platform with a clean, dark-themed UI.

## Features

- **Simple File Uploads**: Drag & drop or click to select files
- **No Registration Required**: Upload files without creating an account
- **Password Protection**: Optionally protect files with a password
- **Expiration Settings**: Files automatically expire (up to 30 days)
- **Short URLs**: Each file gets a short, easy-to-share URL
- **ZIP File Explorer**: Browse and download individual files from ZIP archives
- **User Accounts**: Optional registration for tracking your uploads
- **Dashboard**: Manage all your uploaded files in one place
- **Dark Theme**: Easy on the eyes with a modern dark interface

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Storage**: Cloudflare R2 (S3-compatible)
- **Database**: SQLite (via better-sqlite3)
- **Authentication**: JWT with HTTP-only cookies

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Environment Variables

Create a `.env.local` file with the following variables:

```
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=auto
S3_ENDPOINT=your_r2_endpoint
S3_BUCKET_NAME=your_bucket_name
S3_PUBLIC_URL=your_public_url
JWT_SECRET=your_jwt_secret
```

