import JSZip from 'jszip';
export interface ZipEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: Date;
}
export async function getZipContents(zipBuffer: ArrayBuffer): Promise<ZipEntry[]> {
  const zip = new JSZip();
  const zipFile = await zip.loadAsync(zipBuffer);
  const entries: ZipEntry[] = [];
  for (const [path, file] of Object.entries(zipFile.files)) {
    if (!file.dir) {
      const fileData = await file.async('uint8array');
      entries.push({
        name: file.name.split('/').pop() || file.name,
        path: file.name,
        size: fileData.byteLength,
        isDirectory: file.dir,
        lastModified: new Date(file.date)
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
export async function extractFileFromZip(zipBuffer: ArrayBuffer, filePath: string): Promise<ArrayBuffer | null> {
  const zip = new JSZip();
  const zipFile = await zip.loadAsync(zipBuffer);
  const file = zipFile.file(filePath);
  if (!file) {
    return null;
  }
  const content = await file.async('arraybuffer');
  return content;
}
export function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'zip': 'application/zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'csv': 'text/csv',
    'exe': 'application/octet-stream'
  };
  return mimeTypes[extension] || 'application/octet-stream';
} 