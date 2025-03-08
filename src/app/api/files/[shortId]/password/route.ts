import { NextRequest, NextResponse } from 'next/server';
import { getFileByShortId } from '@/lib/db';
import db from '@/lib/db';
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});
export async function PUT(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  try {
    const { shortId } = params;
    const body = await request.json();
    const { password } = body;
    if (password === undefined) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    const file = getFileByShortId(shortId);
    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    const passwordHash = password 
      ? crypto.createHash('sha256').update(password).digest('hex')
      : null;
    const copyCommand = new CopyObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      CopySource: `${process.env.S3_BUCKET_NAME}/${file.s3Key}`,
      Key: file.s3Key,
      Metadata: {
        originalName: file.fileName,
        contentType: file.contentType,
        expiresAt: file.expiresAt,
        shortId: file.shortId,
        ...(passwordHash ? {
          passwordProtected: 'true',
          passwordHash: passwordHash
        } : {})
      },
      MetadataDirective: 'REPLACE'
    });
    await s3Client.send(copyCommand);
    const stmt = db.prepare(`
      UPDATE files 
      SET passwordHash = ?
      WHERE shortId = ?
    `);
    stmt.run(passwordHash, shortId);
    return NextResponse.json({ 
      success: true,
      passwordHash: passwordHash
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  const { shortId } = params;
  try {
    const file = getFileByShortId(shortId);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.s3Key
    });
    await s3Client.send(deleteCommand);
    const stmt = db.prepare('DELETE FROM files WHERE shortId = ?');
    stmt.run(shortId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
} 