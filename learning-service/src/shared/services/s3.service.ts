import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import * as multer from "multer";
@Injectable()
export class S3Service {
  private s3: S3;
  private readonly logger = new Logger(S3Service.name);
  private readonly BUCKET_NAME: string;

  constructor() {
    // If AWS_ACCESS_KEY_ID isn't set, it will automatically use ECS Task Role credentials
    const hasAwsConfig =
      process.env.AWS_REGION &&
      process.env.AWS_S3_BUCKET_NAME;

    if (hasAwsConfig) {
      this.BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
      
      const s3Config: any = { region: process.env.AWS_REGION };
      
      // Use explicit credentials if provided (e.g. for local development)
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        s3Config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }

      this.s3 = new S3(s3Config);
      this.logger.log("S3 service initialized" + (s3Config.credentials ? " with explicit credentials" : " with IAM role credentials"));
    } else {
      this.BUCKET_NAME = "default-bucket";
      // Create a dummy S3 instance to avoid null errors
      this.s3 = new S3({
        region: "us-east-1",
        credentials: {
          accessKeyId: "dummy",
          secretAccessKey: "dummy",
        },
      });
      this.logger.warn(
        "S3 service initialized with dummy credentials - AWS credentials not configured. S3 operations will fail.",
      );
    }
  }
  upload = multer({ storage: multer.memoryStorage() });

  // Video upload configuration with file size and type validation
  uploadVideo = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 1024 * 1024 * 1024, // 1000MB limit
    },
    fileFilter: (req, file, cb) => {
      // Validate video file types
      const allowedMimeTypes = [
        "video/mp4",
        "video/quicktime", // .mov files
        "video/x-msvideo", // .avi files
        "video/x-matroska", // .mkv files
        "video/webm",
      ];

      const allowedExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
      const fileExtension = file.originalname
        .toLowerCase()
        .substring(file.originalname.lastIndexOf("."));

      if (
        allowedMimeTypes.includes(file.mimetype) &&
        allowedExtensions.includes(fileExtension)
      ) {
        cb(null, true);
      } else {
        cb(
          new Error(
            "Invalid video format. Only MP4, MOV, AVI, MKV, and WebM files are allowed.",
          ),
        );
      }
    },
  });

  // Generate presigned URL for video upload
  generatePresignedUploadUrl = async (
    courseId: number,
    moduleId: number,
    lessonId: number,
    filename: string,
    contentType: string = "video/mp4",
    expiresIn: number = 3600, // 1 hour
  ) => {
    try {
      const fileExt = filename.split(".").pop();
      const key = `videos/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/source.mp4`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          courseId: courseId.toString(),
          lessonId: lessonId.toString(),
          originalFilename: filename,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned upload URL: ${error.message}`,
      );
      throw error;
    }
  };

  generatePresignedMaterialUploadUrl = async (
    courseId: number,
    moduleId: number,
    lessonId: number,
    filename: string,
    contentType: string,
    expiresIn: number = 3600, // 1 hour
  ) => {
    try {
      const fileExt = filename.split(".").pop();
      const key = `materials/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/${filename}.${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          courseId: courseId.toString(),
          lessonId: lessonId.toString(),
          originalFilename: filename,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned material upload URL: ${error.message}`,
      );
      throw error;
    }
  };

  // Generate presigned URL for video streaming
  generatePresignedStreamUrl = async (
    courseId: number,
    moduleId: number,
    lessonId: number,
    filename: string = "source.mp4",
    expiresIn: number = 7200, // 2 hours
  ) => {
    try {
      const key = `videos/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/source.mp4`;

      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      const streamUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        streamUrl,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned stream URL: ${error.message}`,
      );
      throw error;
    }
  };

  // Generate presigned URL for thumbnail
  generatePresignedThumbnailUrl = async (
    courseId: number,
    moduleId: number,
    lessonId: number,
    expiresIn: number = 86400, // 24 hours
  ) => {
    const key = `videos/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/thumbnail.jpg`;

    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key,
    });

    try {
      const thumbnailUrl = await getSignedUrl(this.s3, command, { expiresIn });
      return {
        thumbnailUrl,
        expiresIn,
      };
    } catch (error) {
      this.logger.warn(
        `Thumbnail not found for course ${courseId}, lesson ${lessonId}`,
      );
      return null;
    }
  };

  // Get S3 key from full URL
  getS3KeyFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  };

  // Check if video file is supported
  isVideoFileSupported = (filename: string, mimeType?: string): boolean => {
    const supportedExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    const supportedMimeTypes = [
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/webm",
    ];

    const fileExtension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));
    const isExtensionValid = supportedExtensions.includes(fileExtension);
    const isMimeTypeValid = mimeType
      ? supportedMimeTypes.includes(mimeType)
      : true;

    return isExtensionValid && isMimeTypeValid;
  };

  // Get video content type from file extension
  getVideoContentType = (filename: string): string => {
    const extension = filename
      .toLowerCase()
      .substring(filename.lastIndexOf("."));

    switch (extension) {
      case ".mp4":
        return "video/mp4";
      case ".mov":
        return "video/quicktime";
      case ".avi":
        return "video/x-msvideo";
      case ".mkv":
        return "video/x-matroska";
      case ".webm":
        return "video/webm";
      default:
        return "video/mp4";
    }
  };

  // Validate video file size
  validateVideoFileSize = (fileSize: number, maxSizeInMB = 500): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSize <= maxSizeInBytes;
  };

  // Generate video thumbnail upload URL
  generateVideoThumbnailUploadUrl = async (
    courseId: number,
    lessonId: number,
    expiresIn: number = 3600,
  ) => {
    try {
      const key = `videos/courses/${courseId}/lessons/${lessonId}/thumbnail.jpg`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: "image/jpeg",
        Metadata: {
          courseId: courseId.toString(),
          lessonId: lessonId.toString(),
          type: "thumbnail",
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        uploadUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate thumbnail upload URL: ${error.message}`,
      );
      throw error;
    }
  };

  // Update media asset status
  updateMediaAssetStatus = (
    s3Key: string,
    status: "UPLOADING" | "TRANSCODING" | "READY" | "FAILED",
    duration?: number,
  ) => {
    // This would typically interact with your database to update the MediaAsset record
    // Implementation depends on your database service
    this.logger.log(`Updating media asset status: ${s3Key} -> ${status}`);
    return {
      s3Key,
      status,
      duration,
    };
  };
  // Generate presigned URL for blog image upload
  generatePresignedBlogImageUploadUrl = async (
    filename: string,
    contentType: string,
    expiresIn: number = 3600,
  ) => {
    try {
      const fileExt = filename.split(".").pop();
      const key = `blogs/images/${uuidv4()}.${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          type: "blog-image",
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      const publicUrl = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return {
        uploadUrl,
        key,
        publicUrl,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate blog image upload URL: ${error.message}`,
      );
      throw error;
    }
  };

  uploadFileToS3 = async (file: Express.Multer.File, key?: string) => {
    const fileKey = `${key}/${uuidv4()}.${file.originalname.split(".").pop()}`;

    const command = new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.s3.send(command);

    const url = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    return {
      key: fileKey,
      url,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  };

  // Recording-specific methods for WebRTC classes
  uploadRecording = async (
    recordingBuffer: Buffer,
    classId: string,
    recordingId: string,
    filename: string,
    contentType: string = "video/webm",
  ) => {
    try {
      const key = `recordings/${classId}/${recordingId}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: recordingBuffer,
        ContentType: contentType,
        Metadata: {
          classId,
          recordingId,
          originalFilename: filename,
          uploadedAt: new Date().toISOString(),
          type: "class-recording",
        },
      });

      await this.s3.send(command);

      const url = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      this.logger.log(`Recording uploaded to S3: ${key}`);

      return {
        key,
        url,
        recordingId,
        classId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload recording to S3:`, error);
      throw error;
    }
  };

  generateRecordingUploadUrl = async (
    classId: string,
    recordingId: string,
    filename: string,
    contentType: string = "video/webm",
    expiresIn: number = 3600, // 1 hour for upload
  ) => {
    try {
      const key = `recordings/${classId}/${recordingId}/${filename}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
          classId,
          recordingId,
          originalFilename: filename,
          uploadedAt: new Date().toISOString(),
          type: "class-recording",
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      const publicUrl = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      this.logger.log(`Generated presigned upload URL for recording: ${key}`);

      return {
        uploadUrl,
        publicUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(`Failed to generate recording upload URL:`, error);
      throw error;
    }
  };

  generateRecordingStreamUrl = async (
    classId: string,
    recordingId: string,
    filename: string,
    expiresIn: number = 3600, // 1 hour
  ) => {
    try {
      const key = `recordings/${classId}/${recordingId}/${filename}`;

      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      const streamUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        streamUrl,
        expiresIn,
        key,
      };
    } catch (error) {
      this.logger.error(`Failed to generate recording stream URL:`, error);
      throw error;
    }
  };

  uploadClassDocument = async (
    file: Express.Multer.File,
    classId: string,
    uploadedBy: string,
  ) => {
    try {
      const fileExt = file.originalname.split(".").pop();
      const key = `documents/${classId}/${Date.now()}-${uuidv4()}.${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          classId,
          uploadedBy,
          originalFilename: file.originalname,
          uploadedAt: new Date().toISOString(),
          type: "class-document",
        },
      });

      await this.s3.send(command);

      const url = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      this.logger.log(`Class document uploaded to S3: ${key}`);

      return {
        key,
        url,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        classId,
      };
    } catch (error) {
      this.logger.error(`Failed to upload class document to S3:`, error);
      throw error;
    }
  };

  generateDocumentPresignedUrl = async (
    classId: string,
    documentKey: string,
    expiresIn: number = 3600,
  ) => {
    try {
      const command = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: documentKey,
      });

      const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn });

      return {
        presignedUrl,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(`Failed to generate document presigned URL:`, error);
      throw error;
    }
  };

  // Generate presigned URL for class folder material upload
  generateClassFolderMaterialUploadUrl = async (
    classId: number,
    filename: string,
    contentType: string,
    fileSizeByte: number,
    expiresIn: number = 3600, // 1 hour
  ) => {
    try {
      const fileExt = filename.split(".").pop();
      const timestamp = Date.now();
      const uuid = uuidv4();
      const key = `class-materials/${classId}/${timestamp}-${uuid}.${fileExt}`;

      const command = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentLength: fileSizeByte, // Enforce size limit at S3 level
        Metadata: {
          classId: classId.toString(),
          originalFilename: filename,
          uploadedAt: new Date().toISOString(),
          type: "class-folder-material",
          sizeByte: fileSizeByte.toString(),
        },
      });

      const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

      const publicUrl = `https://${this.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      this.logger.log(
        `Generated presigned upload URL for class folder material: ${key}`,
      );

      return {
        uploadUrl,
        publicUrl,
        key,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate class folder material upload URL: ${error.message}`,
      );
      throw error;
    }
  };

  // Delete object from S3
  deleteObject = async (key: string): Promise<void> => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: key,
      });

      await this.s3.send(command);
      this.logger.log(`Deleted object from S3: ${key}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete object from S3 (${key}): ${error.message}`,
      );
      // Don't throw error - file might not exist, continue with resource deletion
    }
  };
}
