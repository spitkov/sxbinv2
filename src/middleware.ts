import { NextRequest, NextResponse } from 'next/server';
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/dashboard'
  ) {
    return NextResponse.next();
  }
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const shortId = segments[0];
    if (
      pathname.endsWith('/raw') || 
      pathname.endsWith('/download') || 
      pathname.endsWith('/contents') || 
      pathname.endsWith('/extract') || 
      pathname.endsWith('/info')
    ) {
      return NextResponse.next();
    }
  }
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
  return NextResponse.next();
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};