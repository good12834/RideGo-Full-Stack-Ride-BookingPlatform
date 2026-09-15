import { v2 as cloudinary } from "cloudinary";

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
export const cloudinaryEnabled = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

export async function uploadImage(buffer, folder = "ridego") {
  if (!cloudinaryEnabled) return null;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}
