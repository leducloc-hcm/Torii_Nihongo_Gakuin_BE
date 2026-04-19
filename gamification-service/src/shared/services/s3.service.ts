import { PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class S3Service {
  private readonly s3: S3;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly logger = new Logger(S3Service.name);

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET_NAME ?? "default-bucket";
    this.region = process.env.AWS_REGION ?? "ap-southeast-1";

    const s3Config: any = { region: this.region };

      s3Config.credentials = {
        accessKeyId: 'AKIA5SEU3U6XXXATV5CM',
        secretAccessKey: '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',
      };
    

    this.s3 = new S3(s3Config);

    if (!process.env.AWS_S3_BUCKET_NAME) {
      this.logger.warn("AWS_S3_BUCKET_NAME not set – S3 uploads will fail.");
    }
  }

  async uploadFileToS3(
    file: Express.Multer.File,
    folder = "rewards",
  ): Promise<string> {
    const ext = file.originalname.split(".").pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async generatePresignedImageUploadUrl(
    filename: string,
    contentType: string,
    folder = "rewards",
    expiresIn = 3600,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    const ext = filename.split(".").pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });
    const publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, key, publicUrl };
  }
}
