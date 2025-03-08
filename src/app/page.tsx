import FileUploader from '@/components/FileUploader';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'sxbin.gay - Simple File Sharing',
  description: 'Simple, anonymous file uploads. No registration required. Files expire automatically and can be optionally password protected.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  applicationName: 'sxbin.gay',
  authors: [{ name: 'sxbin.gay' }],
  keywords: ['file sharing', 'file upload', 'anonymous upload', 'temporary files'],
  openGraph: {
    title: 'sxbin.gay - Simple File Sharing',
    description: 'Simple, anonymous file uploads. No registration required. Files expire automatically and can be optionally password protected.',
    type: 'website',
    siteName: 'sxbin.gay',
    locale: 'en_US',
    url: '/',
    determiner: 'the',
  },
  twitter: {
    card: 'summary',
    title: 'sxbin.gay - Simple File Sharing',
    description: 'Simple, anonymous file uploads. No registration required. Files expire automatically and can be optionally password protected.',
    creator: '@sxbin',
    site: '@sxbin'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
  category: 'Technology'
};
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">sxbin.gay</h1>
          <p className="text-gray-400 text-center max-w-lg">
            Simple, anonymous file uploads. No registration required.
            Files expire automatically and can be optionally password protected.
          </p>
        </div>
        <FileUploader />
        <footer className="mt-12 text-center text-xs sm:text-sm text-gray-500">
          <p>
            Files are automatically deleted after the expiration period (max 30 days).
          </p>
        </footer>
      </div>
    </main>
  );
}