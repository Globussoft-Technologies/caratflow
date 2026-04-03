import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

interface UploadFileInput {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  entityType?: string;
  entityId?: string;
}

interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

/** Allowed MIME types for upload. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

@Injectable()
export class PlatformFileService extends TenantAwareService {
  private readonly storageProvider: 'LOCAL' | 'S3' | 'MINIO';
  private readonly bucketName: string;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.storageProvider = (process.env.STORAGE_PROVIDER as 'LOCAL' | 'S3' | 'MINIO') ?? 'MINIO';
    this.bucketName = process.env.STORAGE_BUCKET ?? 'caratflow';
  }

  /** Upload a file to storage and create metadata record. */
  async uploadFile(tenantId: string, input: UploadFileInput, uploadedBy: string) {
    // Validate
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new BadRequestException(`File type "${input.mimeType}" is not allowed`);
    }
    if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(`File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    // Generate a unique storage key
    const fileId = uuid();
    const ext = input.originalName.split('.').pop() ?? 'bin';
    const storageKey = `${tenantId}/${input.entityType ?? 'general'}/${fileId}.${ext}`;

    // Upload to storage provider
    await this.uploadToStorage(storageKey, input.buffer, input.mimeType);

    // Create metadata record
    const fileUpload = await this.prisma.fileUpload.create({
      data: {
        id: fileId,
        tenantId,
        fileName: input.fileName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageProvider: this.storageProvider,
        storageKey,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        uploadedBy,
      },
    });

    return fileUpload;
  }

  /** Get a presigned URL for downloading/viewing a file. */
  async getPresignedUrl(tenantId: string, fileId: string): Promise<PresignedUrlResult> {
    const file = await this.prisma.fileUpload.findFirst({
      where: this.tenantWhere(tenantId, { id: fileId }),
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const url = await this.generatePresignedUrl(file.storageKey);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    return { url, expiresAt };
  }

  /** Delete a file from storage and remove metadata. */
  async deleteFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: this.tenantWhere(tenantId, { id: fileId }),
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.deleteFromStorage(file.storageKey);
    await this.prisma.fileUpload.delete({ where: { id: fileId } });

    return { success: true };
  }

  /** Get file metadata by ID. */
  async getFileById(tenantId: string, fileId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: this.tenantWhere(tenantId, { id: fileId }),
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  /** Get all files linked to a specific entity. */
  async getFilesForEntity(tenantId: string, entityType: string, entityId: string) {
    return this.prisma.fileUpload.findMany({
      where: { tenantId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Link an existing file to an entity. */
  async linkFileToEntity(tenantId: string, fileId: string, entityType: string, entityId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: this.tenantWhere(tenantId, { id: fileId }),
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.fileUpload.update({
      where: { id: fileId },
      data: { entityType, entityId },
    });
  }

  /** Generate a thumbnail URL for image files. */
  async getThumbnailUrl(tenantId: string, fileId: string, width = 200, height = 200): Promise<string> {
    const file = await this.prisma.fileUpload.findFirst({
      where: this.tenantWhere(tenantId, { id: fileId }),
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException('Thumbnails are only available for image files');
    }

    // In production, generate resized image via sharp or use S3 image processing
    // For now, return a URL with resize params that a CDN/proxy can handle
    const baseUrl = await this.generatePresignedUrl(file.storageKey);
    return `${baseUrl}?w=${width}&h=${height}&fit=cover`;
  }

  // ─── Storage Provider Abstraction ────────────────────────────

  private async uploadToStorage(key: string, buffer: Buffer, contentType: string): Promise<void> {
    switch (this.storageProvider) {
      case 'LOCAL':
        // In production, write to local filesystem
        console.warn(`[FileStorage] LOCAL upload: ${key} (${buffer.length} bytes)`);
        break;
      case 'MINIO':
      case 'S3':
        // In production, use @aws-sdk/client-s3
        // const s3 = new S3Client({ ... });
        // await s3.send(new PutObjectCommand({ Bucket: this.bucketName, Key: key, Body: buffer, ContentType: contentType }));
        console.warn(`[FileStorage] ${this.storageProvider} upload: ${key} (${buffer.length} bytes)`);
        break;
    }
  }

  private async generatePresignedUrl(key: string): Promise<string> {
    switch (this.storageProvider) {
      case 'LOCAL':
        return `/files/${key}`;
      case 'MINIO':
        return `http://localhost:9000/${this.bucketName}/${key}`;
      case 'S3':
        // In production, use @aws-sdk/s3-request-presigner
        return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
      default:
        return `/files/${key}`;
    }
  }

  private async deleteFromStorage(key: string): Promise<void> {
    switch (this.storageProvider) {
      case 'LOCAL':
        console.warn(`[FileStorage] LOCAL delete: ${key}`);
        break;
      case 'MINIO':
      case 'S3':
        // In production, use @aws-sdk/client-s3
        // await s3.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
        console.warn(`[FileStorage] ${this.storageProvider} delete: ${key}`);
        break;
    }
  }
}
