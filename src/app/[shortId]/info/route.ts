import { NextRequest, NextResponse } from 'next/server';
import { getFileByShortId } from '@/lib/db';
import crypto from 'crypto';
export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  const { shortId } = await Promise.resolve(params);
  const password = request.nextUrl.searchParams.get('password');
  try {
    const file = getFileByShortId(shortId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (file.passwordHash) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', passwordProtected: true },
          { status: 403 }
        );
      }
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
      if (file.passwordHash !== hashedPassword) {
        return NextResponse.json(
          { error: 'Invalid password', passwordProtected: true },
          { status: 403 }
        );
      }
    }
    const expiresAt = new Date(file.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'File has expired' }, { status: 410 });
    }
    const { passwordHash, ...fileInfo } = file;
    return NextResponse.json(fileInfo);
  } catch (error) {
    console.error('Error fetching file info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file info' }, 
      { status: 500 }
    );
  }
} 