import { NextRequest, NextResponse } from 'next/server';
import { getFileByShortId } from '@/lib/db';
import { getZipContents } from '@/lib/zipUtils';
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
    if (!file.contentType.includes('zip') && 
        !file.fileName.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Not a ZIP file' }, 
        { status: 400 }
      );
    }
    const zipResponse = await fetch(file.publicUrl);
    if (!zipResponse.ok) {
      throw new Error('Failed to fetch ZIP file from storage');
    }
    const zipBuffer = await zipResponse.arrayBuffer();
    const contents = await getZipContents(zipBuffer);
    return NextResponse.json({ 
      fileName: file.fileName,
      contentType: file.contentType,
      contents 
    });
  } catch (error) {
    console.error('Error listing ZIP contents:', error);
    return NextResponse.json(
      { error: 'Failed to list ZIP contents' }, 
      { status: 500 }
    );
  }
} 