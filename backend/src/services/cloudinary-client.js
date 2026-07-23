const cloudinary = require('cloudinary').v2;

const configured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

function uploadReportImage(buffer, { reporterId, zoneId }) {
  if (!configured) {
    throw new Error('Cloudinary credentials are not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'airsense/reports',
        public_id: `${zoneId}-${reporterId}-${Date.now()}`,
        resource_type: 'image',
        overwrite: false,
        quality: 'auto',
        fetch_format: 'auto',
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve({
          imageUrl: result.secure_url,
          imagePublicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

module.exports = {
  uploadReportImage,
};
