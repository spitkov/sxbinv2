import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { createFileRecord, generateShortId, getUserByApiKey } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});
export async function POST(request: NextRequest) {
  try {
    let userId: string | undefined;
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const user = getUserByApiKey(authHeader);
      if (!user) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
      userId = user.id;
    } else {
      const { authenticated, user } = getCurrentUser(request);
      userId = authenticated && user ? user.id : undefined;
    }
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string || null;
    const expiresIn = formData.get('expiresIn') as string || '7';
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const fileId = nanoid(10);
    const originalName = file.name;
    const shortId = generateShortId(originalName);
    const fileExtension = originalName.split('.').pop() || '';
    const fileKey = `${fileId}.${fileExtension}`;
    const fileSize = file.size;
    const buffer = Buffer.from(await file.arrayBuffer());
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + parseInt(expiresIn));
    const metadata: Record<string, string> = {
      originalName,
      contentType: file.type,
      expiresAt: expirationDate.toISOString(),
      shortId,
    };
    let passwordHash: string | undefined = undefined;
    if (password) {
      passwordHash = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
      metadata.passwordProtected = 'true';
      metadata.passwordHash = passwordHash;
    }
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type,
      Metadata: metadata,
    });
    await s3Client.send(command);
    const publicUrl = `${process.env.S3_PUBLIC_URL}/${fileKey}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'https://sxbin.gay';
    const shortUrl = `${baseUrl}/${shortId}`;
    const fileRecord = createFileRecord({
      fileId,
      shortId,
      fileName: originalName,
      fileSize,
      contentType: file.type,
      s3Key: fileKey,
      passwordHash,
      expiresAt: expirationDate,
      publicUrl,
      userId
    });
    if (authHeader) {
      return NextResponse.json({ url: shortUrl });
    }
    return NextResponse.json({ 
      success: true, 
      fileId,
      shortId,
      shortUrl,
      url: publicUrl,
      expiresAt: expirationDate.toISOString(),
      filename: originalName,
      fileSize,
      passwordProtected: !!password,
      isAuthenticated: !!userId
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
}; 