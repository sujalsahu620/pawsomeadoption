// s3.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadImage = async ({ buffer, originalname, mimetype }) => {
  try {
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${uuidv4()}-${originalname}`,
      Body: buffer,
      ContentType: mimetype,
      // Removing the ACL parameter as it is not supported by your bucket
    };

    const command = new PutObjectCommand(uploadParams);
    const data = await s3.send(command);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
  } catch (error) {
    console.error("Error uploading file: ", error);
    throw error; // Rethrow to let the GraphQL resolver handle it
  }
};

module.exports = { uploadImage };
