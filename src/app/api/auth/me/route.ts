import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
export async function GET(request: NextRequest) {
  try {
    const { authenticated, user } = getCurrentUser(request);
    console.log('Auth check API:', { authenticated, user });
    if (!authenticated || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    return NextResponse.json({
      user
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
} 