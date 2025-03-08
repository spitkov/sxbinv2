import { getFileByShortId } from "@/lib/db";
import { Metadata, ResolvingMetadata } from "next";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Props = {
  params: { shortId: string };
};

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const shortId = params.shortId;
  const file = await getFileByShortId(shortId);

  if (!file) {
    return {
      title: "File Not Found - sxbin.gay",
      description: "This file does not exist or has expired.",
      openGraph: {
        title: "sxbin.gay | Simple File Uploads",
        description: "A simple, no-registration file upload service",
        siteName: "sxbin.gay",
      },
      twitter: {
        card: "summary",
        title: "sxbin.gay | Simple File Uploads",
        description: "A simple, no-registration file upload service",
      },
    };
  }

  // Format the upload date
  const uploadDate = new Date(file.uploadedAt);
  const uploadedAgo = formatDistanceToNow(uploadDate, { addSuffix: true });
  
  // Format the file size
  const sizeFormatted = formatBytes(file.fileSize);

  // Create description with file details
  const description = `${file.fileName} (${sizeFormatted}) - Uploaded ${uploadedAgo}${file.uploaderUsername ? ` by ${file.uploaderUsername}` : ''}`;

  // Determine file type for preview
  const isImage = file.contentType?.startsWith("image/");
  const isPDF = file.contentType === "application/pdf";
  const isVideo = file.contentType?.startsWith("video/");
  const isAudio = file.contentType?.startsWith("audio/");
  const isText = file.contentType?.startsWith("text/") || 
                 file.contentType?.includes("javascript") ||
                 file.contentType?.includes("json");
  const isZip = file.contentType?.includes("zip") || 
               file.fileName.toLowerCase().endsWith(".zip");

  // Get file type label
  let fileType = "File";
  if (isImage) fileType = "Image";
  else if (isPDF) fileType = "PDF Document";
  else if (isVideo) fileType = "Video";
  else if (isAudio) fileType = "Audio";
  else if (isText) fileType = "Text Document";
  else if (isZip) fileType = "ZIP Archive";

  const metadata: Metadata = {
    title: `${file.fileName} - sxbin.gay`,
    description: `${fileType}: ${description}`,
    openGraph: {
      title: "sxbin.gay | Simple File Uploads",
      description: "A simple, no-registration file upload service",
      images: isImage
        ? [
            {
              url: `/${shortId}/raw`,
              width: 1200,
              height: 630,
              alt: file.fileName,
            },
          ]
        : [
            {
              // Default preview image
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: `sxbin.gay - ${fileType} preview`,
            },
          ],
      siteName: "sxbin.gay",
    },
    twitter: {
      card: "summary_large_image",
      title: "sxbin.gay | Simple File Uploads",
      description: "A simple, no-registration file upload service",
      images: isImage ? [`/${shortId}/raw`] : ["/og-image.png"],
    },
  };

  return metadata;
} 