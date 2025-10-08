import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import DataService, { SERVER_URL } from './services/DataService.jsx';

const ImageUpload = ({
  onImagesChange,
  maxImages = 5,
  existingImages = [],
  category = 'general'
}) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Correctly initialize state from existing images when editing
    if (existingImages) {
      setSelectedImages(existingImages);
    }
  }, [existingImages]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedImages.length + files.length > maxImages) {
      setUploadError(`You can only upload a maximum of ${maxImages} images.`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (files.some(file => !validTypes.includes(file.type))) {
      setUploadError('Please select only JPEG, PNG, or WebP images.');
      return;
    }

    if (files.some(file => file.size > 5 * 1024 * 1024)) {
      setUploadError('Each image must be smaller than 5MB.');
      return;
    }

    setUploadError('');
    await uploadFiles(files);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    const successfullyUploaded = [];

    for (const file of files) {
      try {
        const uploadResult = await DataService.uploadImage(file, category);
        if (uploadResult.success) {
          successfullyUploaded.push({
            name: file.name,
            size: file.size,
            url: uploadResult.data.url,
            serverId: uploadResult.data.id, 
          });
        } else {
          throw new Error(uploadResult.message);
        }
      } catch (error) {
        setUploadError(`Upload failed for ${file.name}: ${error.message}`);
      }
    }

    if (successfullyUploaded.length > 0) {
      const updatedImages = [...selectedImages, ...successfullyUploaded];
      setSelectedImages(updatedImages);
      onImagesChange(updatedImages);
    }

    setUploading(false);
  };

  const removeImage = async (index) => {
    const imageToRemove = selectedImages[index];
    
    if (imageToRemove.serverId && imageToRemove.url) {
      try {
        const urlParts = imageToRemove.url.split('/');
        const filename = urlParts.pop();
        const imageCategory = urlParts.pop();
        
        await DataService.deleteImage(imageCategory, filename);
      } catch (error) {
        console.error('Error deleting image from server:', error);
        setUploadError(`Failed to delete ${imageToRemove.name} from server. It might have already been removed.`);
      }
    }

    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesChange(newImages);
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current && !uploading && selectedImages.length < maxImages) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      <div
        onClick={triggerFileSelect}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          uploading || selectedImages.length >= maxImages
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || selectedImages.length >= maxImages}
        />
        <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="font-medium text-gray-700">
          {uploading ? 'Uploading...' : 'Click to upload images'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {selectedImages.length}/{maxImages} images uploaded
        </p>
      </div>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{uploadError}</p>
        </div>
      )}

      {selectedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Uploaded Images
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedImages.map((item, index) => {
              const imageSrc = item.url ? `${SERVER_URL}${item.url}` : '';
              return (
              <div key={item.serverId || index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={item.name || `Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon />
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading}
                  title="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>

                {index === 0 && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                    Main
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;