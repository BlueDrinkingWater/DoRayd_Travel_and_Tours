import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to create a Cloudinary storage engine for a specific folder
const createStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `dorayd/${folder}`, // All uploads will go into a 'dorayd' folder on Cloudinary
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'txt'],
      transformation: [{ width: 1024, height: 1024, crop: 'limit' }], // Resize large images
    },
  });
};

// Generic file filter for images
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// Uploader for Payment Proofs (images)
export const upload = multer({
  storage: createStorage('payment_proofs'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter,
});

// Uploader for Feedback Images
export const uploadFeedback = multer({
  storage: createStorage('feedback'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter,
});

// Uploader for Email Attachments (any file type)
export const uploadAttachment = multer({
  storage: createStorage('attachments'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// Uploader for Profile Pictures (images)
export const uploadProfile = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter,
});