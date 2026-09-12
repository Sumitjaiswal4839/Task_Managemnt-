import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads a buffer directly to Cloudinary under the dedicated synchro folder.
 * Uses resource_type: "auto" to seamlessly support images, documents, PDFs, etc.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string = "synchro/attachments"
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        filename_override: filename,
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Deletes an asset from Cloudinary using its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
}

export default cloudinary;
