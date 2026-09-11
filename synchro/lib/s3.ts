import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Uses generic S3 env variables to work with AWS S3, Cloudflare R2, or others
const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "";

/**
 * Generates a pre-signed URL to upload a file directly to Cloudflare R2 / S3.
 * We strictly define Content-Type to match what the client promised.
 */
export async function generatePresignedPutUrl(
  storageKey: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  });

  // Pre-signed URL expires in 5 minutes
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

/**
 * Generates a short-lived signed URL to securely download a file.
 */
export async function generatePresignedGetUrl(
  storageKey: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: storageKey,
  });

  // Download link expires in 1 hour
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Performs a HEAD request to check if a file exists in the bucket and retrieves its metadata.
 * Useful for verifying uploads before inserting DB records.
 */
export async function verifyObjectExists(storageKey: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageKey,
    });
    const metadata = await s3Client.send(command);
    return {
      success: true,
      size: metadata.ContentLength,
      contentType: metadata.ContentType,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
