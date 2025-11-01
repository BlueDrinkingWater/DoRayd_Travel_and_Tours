import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// 🔹 1. Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 2. Dynamic storage configuration generator
const createStorage = (folder) => {
  const isSensitive = ['payment_proofs', 'profiles', 'attachments'].includes(folder);

  // 🧩 Detect if this folder deals with "raw" files (non-images)
  const isRawFolder = folder === 'attachments';

  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `dorayd/${folder}`,
      // ✅ Automatically choose proper resource type
      resource_type: isRawFolder ? 'raw' : 'image',

      // ✅ Allowed file formats
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'txt', 'doc', 'docx'],

      // ✅ Resize large images (images only)
      transformation: !isRawFolder
        ? [{ width: 1024, height: 1024, crop: 'limit' }]
        : undefined,

      // ✅ Keep sensitive files private
      access_mode: isSensitive ? 'authenticated' : 'public',
    },
  });
};

// 🔹 3. File filters (only apply to image uploads)
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// 🔹 4. Uploaders by purpose

// Payment proof uploader (images only, private)
export const upload = multer({
  storage: createStorage('payment_proofs'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: imageFileFilter,
});

// Feedback images (public)
export const uploadFeedback = multer({
  storage: createStorage('feedback'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Attachments (PDF, DOCX, etc. — private)
export const uploadAttachment = multer({
  storage: createStorage('attachments'),
  limits: { fileSize: 15 * 1024 * 1024 },
  // ❌ no fileFilter here (we allow PDFs, DOCXs, etc.)
});

// Profile pictures (private images)
export const uploadProfile = multer({
  storage: createStorage('profiles'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// General purpose image uploads
export const uploadGeneralImage = multer({
  storage: createStorage('general'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

// Cars, Tours, Transport, QR Codes
export const uploadCarImage = multer({
  storage: createStorage('cars'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadTourImage = multer({
  storage: createStorage('tours'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadTransportImage = multer({
  storage: createStorage('transport'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export const uploadQRCodeImage = multer({
  storage: createStorage('qrcodes'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

export default cloudinary;
