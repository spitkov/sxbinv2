import { NextRequest, NextResponse } from 'next/server';
import { getFileByShortId } from '@/lib/db';
import crypto from 'crypto';
export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  const { shortId } = params;
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
    const fileResponse = await fetch(file.publicUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch file from storage');
    }
    const response = new NextResponse(fileResponse.body);
    response.headers.set(
      'Content-Disposition', 
      `attachment; filename="${encodeURIComponent(file.fileName)}"`
    );
    response.headers.set('Content-Type', file.contentType);
    if (file.fileSize) {
      response.headers.set('Content-Length', file.fileSize.toString());
    }
    return response;
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
} 