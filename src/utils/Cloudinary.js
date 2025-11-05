import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// CLOUDINARY_URL=cloudinary://989981928159862:lyXJ5hr8zgeo5Z6Af9Yc7JPAhrw@dvzzcfzhu

const uploadOnCLoudinary = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      // throw new Error("File does not exist");
      return null;
    }

    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto", // image or video
    });

    console.log("Cloudinary upload response:", response);

    return response;
  } catch (error) {
    fs.unlinkSync(filePath); // delete the local file in case of error
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export { uploadOnCLoudinary };
