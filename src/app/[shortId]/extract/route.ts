import { NextRequest, NextResponse } from 'next/server';
import { getFileByShortId } from '@/lib/db';
import { extractFileFromZip, getMimeType } from '@/lib/zipUtils';
import crypto from 'crypto';
export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  const { shortId } = params;
  const filePath = request.nextUrl.searchParams.get('path');
  const password = request.nextUrl.searchParams.get('password');
  const download = request.nextUrl.searchParams.get('download') === 'true';
  const baseShortId = shortId.includes('.') ? shortId.split('.')[0] : shortId;
  if (!filePath) {
    return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
  }
  try {
    let file = getFileByShortId(shortId);
    if (!file && shortId !== baseShortId) {
      file = getFileByShortId(baseShortId);
    }
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
    const extractedFile = await extractFileFromZip(zipBuffer, filePath);
    if (!extractedFile) {
      return NextResponse.json(
        { error: 'File not found in ZIP archive' }, 
        { status: 404 }
      );
    }
    const fileName = filePath.split('/').pop() || 'file';
    const contentType = getMimeType(fileName);
    const response = new NextResponse(extractedFile);
    response.headers.set('Content-Type', contentType);
    if (download) {
      response.headers.set(
        'Content-Disposition', 
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
    } else {
      response.headers.set(
        'Content-Disposition', 
        `inline; filename="${encodeURIComponent(fileName)}"`
      );
    }
    response.headers.set('Content-Length', extractedFile.byteLength.toString());
    return response;
  } catch (error) {
    console.error('Error extracting file from ZIP:', error);
    return NextResponse.json(
      { error: 'Failed to extract file from ZIP' }, 
      { status: 500 }
    );
  }
} 