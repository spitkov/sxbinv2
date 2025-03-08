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
      title: "File Not Found - sxbin",
      description: "This file does not exist or has expired.",
    };
  }

  // Format the upload date
  const uploadDate = new Date(file.uploadedAt);
  const uploadedAgo = formatDistanceToNow(uploadDate, { addSuffix: true });
  
  // Format the file size
  const sizeFormatted = formatBytes(file.fileSize);

  // Create description with file details
  const description = `${file.fileName} (${sizeFormatted}) - Uploaded ${uploadedAgo}${file.uploaderUsername ? ` by ${file.uploaderUsername}` : ''}`;

  const metadata: Metadata = {
    title: `${file.fileName} - sxbin`,
    description,
    openGraph: {
      title: `${file.fileName} - sxbin`,
      description,
      images: file.contentType?.startsWith("image/")
        ? [
            {
              url: `/api/files/${shortId}/raw`,
              width: 1200,
              height: 630,
              alt: file.fileName,
            },
          ]
        : [
            {
              // Default preview image for non-image files
              url: `/api/files/${shortId}/preview`,
              width: 1200,
              height: 630,
              alt: `Preview of ${file.fileName}`,
            },
          ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${file.fileName} - sxbin`,
      description,
      images: file.contentType?.startsWith("image/")
        ? [`/api/files/${shortId}/raw`]
        : [`/api/files/${shortId}/preview`],
    },
  };

  return metadata;
} 