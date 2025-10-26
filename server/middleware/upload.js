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
  // CRITICAL: These folders contain sensitive data and must be authenticated.
  const isSensitive = ['payment_proofs', 'profiles', 'attachments'].includes(folder);

  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `dorayd/${folder}`, // All uploads will go into a 'dorayd' folder on Cloudinary
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'txt'],
      transformation: [{ width: 1024, height: 1024, crop: 'limit' }], // Resize large images

      // Apply authenticated access for sensitive folders, public for all others
      // This sets the appropriate 'type' ('authenticated' or 'upload') during upload
      access_mode: isSensitive ? 'authenticated' : 'public',
      // resource_type: 'auto' // Let Cloudinary detect file type (image, raw for pdf/txt)
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

// Uploader for Payment Proofs (secured via createStorage)
export const upload = multer({
  storage: createStorage('payment_proofs'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter,
});

// Uploader for Feedback Images (remains public via createStorage)
export const uploadFeedback = multer({
  storage: createStorage('feedback'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter,
});

// Uploader for Email Attachments (secured via createStorage)
export const uploadAttachment = multer({
  storage: createStorage('attachments'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
  // No file filter here to allow PDF, TXT etc.
});

// Uploader for Profile Pictures (secured via createStorage)
export const uploadProfile = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter,
});

// Uploader for general, car, tour, transport images (public via createStorage)
export const uploadGeneralImage = multer({ storage: createStorage('general'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
export const uploadCarImage = multer({ storage: createStorage('cars'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
export const uploadTourImage = multer({ storage: createStorage('tours'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
export const uploadTransportImage = multer({ storage: createStorage('transport'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: imageFileFilter });
export const uploadQRCodeImage = multer({ storage: createStorage('qrcodes'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFileFilter });
