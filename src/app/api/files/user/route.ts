import { NextRequest, NextResponse } from 'next/server';
import { getFilesByUserId } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export async function GET(request: NextRequest) {
  try {
    const { authenticated, user } = getCurrentUser(request);
    console.log('Auth status:', { authenticated, user });
    if (!authenticated || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const files = getFilesByUserId(user.id);
    console.log('Files found:', files.length);
    return NextResponse.json({
      files
    });
  } catch (error) {
    console.error('Error fetching user files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
} 