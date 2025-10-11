import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for uploads
const uploadsDir = path.join(__dirname, '../uploads');

// Function to create storage engine for a specific folder
const createStorage = (folder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(uploadsDir, folder);
      // Ensure the directory exists
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Create a unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
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

// Uploader for Payment Proofs
export const upload = multer({
  storage: createStorage('payment_proofs'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: imageFileFilter,
});

// Uploader for Email Attachments
export const uploadAttachment = multer({
  storage: createStorage('attachments'),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit
});

// Uploader for Profile Pictures
export const uploadProfile = multer({
    storage: createStorage('profiles'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: imageFileFilter,
});