const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const uploadToFirebase = async (file) => {
    return new Promise((resolve, reject) => {
        const bucket = admin.storage().bucket();
        const fileName = `uploads/${uuidv4()}_${file.originalname}`;
        const fileUpload = bucket.file(fileName);

        const blobStream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype
            }
        });

        blobStream.on('error', (error) => {
            reject(error);
        });

        blobStream.on('finish', async () => {
            // Make the file public (or get a signed URL)
            try {
                await fileUpload.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
                resolve(publicUrl);
            } catch (err) {
                reject(err);
            }
        });

        blobStream.end(file.buffer);
    });
};

module.exports = { uploadToFirebase };
