import { deleteExpiredFiles } from './db';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import cron from 'node-cron';
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});
async function deleteExpiredS3Objects() {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
    });
    const listedObjects = await s3Client.send(listCommand);
    if (!listedObjects.Contents?.length) return;
    const deletePromises = listedObjects.Contents.map(async (object) => {
      if (!object.Key) return;
      const headCommand = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: object.Key,
      });
      const objectData = await s3Client.send(headCommand);
      const metadata = objectData.Contents?.[0]?.Key;
      if (metadata) {
        const expiresAt = new Date(metadata);
        if (expiresAt < new Date()) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: object.Key,
          });
          await s3Client.send(deleteCommand);
          console.log(`Deleted expired file: ${object.Key}`);
        }
      }
    });
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error deleting expired S3 objects:', error);
  }
}
export async function cleanupExpiredFiles() {
  console.log('Running cleanup of expired files...');
  try {
    const result = deleteExpiredFiles();
    console.log(`Deleted ${result.changes} expired records from database`);
    await deleteExpiredS3Objects();
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}
export function scheduleCleanup() {
  cleanupExpiredFiles();
  cron.schedule('0 0 * * *', () => {
    cleanupExpiredFiles();
  });
} 