const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary with environment credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Uploads a zip Buffer to Cloudinary as a private raw resource.
 * The zip is stored under the 'bookflow' folder with the given publicId.
 *
 * @param {Buffer} buffer      - Zip archive buffer
 * @param {string} publicId    - Desired Cloudinary public_id (e.g. 'bookflow/my_book_title')
 * @returns {Promise<Object>}  - Cloudinary upload result object
 */
const uploadZipBuffer = (buffer, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'raw',
        type: 'private',           // Private delivery — no direct public URL
        folder: 'bookflow',
        overwrite: true,
        tags: ['bookflow', 'zip'],
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve(result);
      }
    );

    // Convert buffer to readable stream and pipe to upload stream
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Generates a short-lived signed URL for private Cloudinary resource access.
 * Used ONLY server-side for the proxy stream — never returned to the client.
 *
 * @param {string} publicId  - Cloudinary public_id of the resource
 * @param {number} expiresIn - Seconds until URL expires (default: 60)
 * @returns {string}         - Signed private URL
 */
const getSignedUrl = (publicId, expiresIn = 60) => {
  const expires = Math.floor(Date.now() / 1000) + expiresIn;
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'private',
    sign_url: true,
    expires_at: expires,
  });
};

/**
 * Deletes a private raw resource from Cloudinary.
 * @param {string} publicId
 */
const deleteResource = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'private' });
};

module.exports = { uploadZipBuffer, getSignedUrl, deleteResource };
