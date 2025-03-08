import { Metadata } from 'next';
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
export async function generateMetadata({ params }: { params: { shortId: string } }): Promise<Metadata> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/${params.shortId}/info`, { next: { revalidate: 60 } });
    if (!response.ok) {
      return {
        title: 'File Not Found - sxbin.gay',
        description: 'The requested file could not be found or has expired.',
        openGraph: {
          title: 'File Not Found - sxbin.gay',
          description: 'The requested file could not be found or has expired.',
          type: 'website',
          siteName: 'sxbin.gay'
        }
      };
    }
    const fileData = await response.json();
    const isImage = fileData.contentType.startsWith('image/');
    const isPDF = fileData.contentType === 'application/pdf';
    const isVideo = fileData.contentType.startsWith('video/');
    const isAudio = fileData.contentType.startsWith('audio/');
    const isText = fileData.contentType.startsWith('text/') || 
                   fileData.contentType.includes('javascript') ||
                   fileData.contentType.includes('json');
    const isZip = fileData.contentType.includes('zip') || 
                  fileData.fileName.toLowerCase().endsWith('.zip');
    const formattedSize = formatFileSize(fileData.fileSize);
    const formattedDate = new Date(fileData.uploadedAt).toLocaleString();
    let fileType = 'File';
    if (isImage) fileType = 'Image';
    else if (isPDF) fileType = 'PDF Document';
    else if (isVideo) fileType = 'Video';
    else if (isAudio) fileType = 'Audio';
    else if (isText) fileType = 'Text Document';
    else if (isZip) fileType = 'ZIP Archive';
    const description = `${fileType}: ${fileData.fileName} (${formattedSize}) - Uploaded ${formattedDate}${fileData.uploaderUsername ? ` by ${fileData.uploaderUsername}` : ''}`;
    const openGraph: any = {
      title: `${fileData.fileName} - sxbin.gay`,
      description,
      type: 'website',
      siteName: 'sxbin.gay',
      locale: 'en_US',
      url: `${baseUrl}/${params.shortId}`,
    };
    if (isImage) {
      openGraph.images = [{
        url: fileData.publicUrl,
        width: 1200,
        height: 630,
        alt: fileData.fileName
      }];
    } else if (isVideo) {
      openGraph.type = 'video.other';
      openGraph.videos = [{
        url: fileData.publicUrl,
        width: 1280,
        height: 720,
        type: fileData.contentType
      }];
    } else if (isAudio) {
      openGraph.type = 'music.song';
      openGraph.audio = [{
        url: fileData.publicUrl,
        type: fileData.contentType
      }];
    } else if (isText) {
      openGraph.type = 'article';
      openGraph.article = {
        publishedTime: fileData.uploadedAt,
        modifiedTime: fileData.uploadedAt,
        author: fileData.uploaderUsername || 'Anonymous'
      };
    }
    return {
      title: `${fileData.fileName} - sxbin.gay`,
      description,
      openGraph,
      twitter: {
        card: isImage ? 'summary_large_image' : 'summary',
        title: `${fileData.fileName} - sxbin.gay`,
        description,
        site: '@sxbin',
        ...(isImage && { images: [fileData.publicUrl] })
      }
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error - sxbin.gay',
      description: 'An error occurred while loading the file.',
      openGraph: {
        title: 'Error - sxbin.gay',
        description: 'An error occurred while loading the file.',
        type: 'website',
        siteName: 'sxbin.gay'
      }
    };
  }
} 