import { v2 as cloudinary } from 'cloudinary';

// This function generates a temporary, authenticated URL for a private image.
export const getSecureImageUrl = async (req, res) => {
    try {
        // The public_id contains the folder and filename (e.g., dorayd/profiles/xyz-123)
        const { public_id } = req.params;

        if (!public_id) {
            return res.status(400).json({ success: false, message: 'Image ID is required.' });
        }
        
        // Decode the ID since the client will encode it (it contains slashes)
        const decodedPublicId = decodeURIComponent(public_id);
        
        // CRITICAL: Check to ensure the request is for an intended private folder
        const privateFolders = ['dorayd/payment_proofs', 'dorayd/profiles', 'dorayd/attachments'];
        const isPrivate = privateFolders.some(folder => decodedPublicId.startsWith(folder));

        if (!isPrivate) {
             // Block access if it's not in an intended private folder
            return res.status(403).json({ success: false, message: 'Access denied: Resource is not configured as private in the backend, or unauthorized.' });
        }
        
        // Authorization is handled by the 'auth' middleware which ensures a valid user token exists.
        
        // Generate a signed URL for the private resource
        const signedUrl = cloudinary.url(decodedPublicId, {
            type: 'authenticated', // Crucial for private files
            secure: true, 
            // URL will be valid for 1 hour (3600 seconds)
            expires_at: Math.round((new Date().getTime() + 3600000) / 1000), 
            sign_url: true
        });

        res.json({ success: true, data: { url: signedUrl } });
        
    } catch (error) {
        console.error('Secure Image Retrieval Error:', error);
        res.status(500).json({ success: false, message: 'Failed to securely retrieve image.' });
    }
};
