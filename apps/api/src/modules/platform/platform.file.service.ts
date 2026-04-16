// ─── Platform File Service ────────────────────────────────────
// Real S3-compatible file storage (AWS S3 + MinIO) using
// @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
//
// Required env:
//   S3_BUCKET                 — bucket name
//   S3_ACCESS_KEY_ID          — access key
//   S3_SECRET_ACCESS_KEY      — secret key
// Optional env:
//   S3_ENDPOINT               — set for MinIO (e.g. http://localhost:9000)
//   S3_REGION                 — default "us-east-1"
//   S3_FORCE_PATH_STYLE       — "true" for MinIO
//   S3_PUBLIC_URL             — override the public URL base (rare)
//
// If S3_BUCKET or credentials are missing, uploadFile/getPresignedUrl/
// deleteFile throw a clear configuration error.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  folder?: string;
}

interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  mimeType: string;
  size: number;
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
const DEFAULT_PRESIGN_EXPIRES_SECONDS = 3600;

@Injectable()
export class PlatformFileService extends TenantAwareService {
  private readonly logger = new Logger(PlatformFileService.name);
  private readonly storageProvider: 'LOCAL' | 'S3' | 'MINIO';
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly publicUrlBase?: string;
  private cachedClient: S3Client | null = null;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.storageProvider = (process.env.STORAGE_PROVIDER as 'LOCAL' | 'S3' | 'MINIO') ?? 'MINIO';
    this.bucketName = process.env.S3_BUCKET ?? process.env.STORAGE_BUCKET ?? 'caratflow';
    this.region = process.env.S3_REGION ?? 'us-east-1';
    this.endpoint = process.env.S3_ENDPOINT ?? undefined;
    this.forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? '').toLowerCase() === 'true';
    this.publicUrlBase = process.env.S3_PUBLIC_URL ?? undefined;
  }

  // ─── Public low-level helpers (new API per gap-audit) ─────────

  /**
   * Upload a buffer to S3/MinIO and return the object metadata.
   * Does NOT create a FileUpload row — use the higher-level
   * uploadFile (with UploadFileInput) for that.
   */
  async uploadBuffer(
    tenantId: string,
    file: Buffer,
    originalName: string,
    mimeType: string,
    folder?: string,
  ): Promise<UploadResult> {
    const key = `${tenantId}/${folder ?? 'uploads'}/${uuid()}-${this.safeName(originalName)}`;
    await this.putObject(key, file, mimeType);
    const url = this.buildPublicUrl(key);
    return {
      url,
      key,
      bucket: this.bucketName,
      mimeType,
      size: file.length,
    };
  }

  /** Delete an object by S3 key. */
  async deleteObject(_tenantId: string, key: string): Promise<void> {
    const client = this.getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  /** Generate a short-lived presigned GET URL for an object. */
  async getSignedGetUrl(
    _tenantId: string,
    key: string,
    expiresIn: number = DEFAULT_PRESIGN_EXPIRES_SECONDS,
  ): Promise<string> {
    const client = this.getClient();
    const cmd = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(client, cmd, { expiresIn });
  }

  // ─── Existing higher-level API (kept for back-compat) ─────────

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
    const folder = input.folder ?? input.entityType ?? 'general';
    const storageKey = `${tenantId}/${folder}/${fileId}.${ext}`;

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
    const expiresAt = new Date(Date.now() + DEFAULT_PRESIGN_EXPIRES_SECONDS * 1000);

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

    const baseUrl = await this.generatePresignedUrl(file.storageKey);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}w=${width}&h=${height}&fit=cover`;
  }

  // ─── S3 client lifecycle ──────────────────────────────────────

  /**
   * Lazily construct a single S3Client. Throws a clear error if
   * the bucket or credentials are not configured.
   */
  private getClient(): S3Client {
    if (this.cachedClient) return this.cachedClient;
    if (!this.isConfigured()) {
      throw new Error('File storage not configured: set S3_BUCKET + credentials');
    }
    const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;

    this.cachedClient = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle || !!this.endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(
      `S3 client initialized: bucket=${this.bucketName} region=${this.region}${this.endpoint ? ` endpoint=${this.endpoint}` : ''}`,
    );
    return this.cachedClient;
  }

  private isConfigured(): boolean {
    return Boolean(
      process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY,
    );
  }

  // ─── Storage primitives ──────────────────────────────────────

  private async putObject(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded ${key} (${buffer.length} bytes, ${contentType})`);
  }

  private async uploadToStorage(key: string, buffer: Buffer, contentType: string): Promise<void> {
    // LOCAL provider or unconfigured env → dev/test noop. Keeps unit tests
    // runnable without a real S3 endpoint. Production deployments must set
    // STORAGE_PROVIDER=S3|MINIO + S3_BUCKET + credentials.
    if (this.storageProvider === 'LOCAL' || !this.isConfigured()) {
      this.logger.debug(`[${this.storageProvider}] noop upload ${key} (${buffer.length} bytes)`);
      return;
    }
    await this.putObject(key, buffer, contentType);
  }

  private async deleteFromStorage(key: string): Promise<void> {
    if (this.storageProvider === 'LOCAL' || !this.isConfigured()) {
      this.logger.debug(`[${this.storageProvider}] noop delete ${key}`);
      return;
    }
    const client = this.getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    this.logger.log(`Deleted ${key}`);
  }

  private async generatePresignedUrl(key: string): Promise<string> {
    if (this.storageProvider === 'LOCAL' || !this.isConfigured()) {
      return this.buildPublicUrl(key);
    }
    const client = this.getClient();
    const cmd = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
    return getSignedUrl(client, cmd, { expiresIn: DEFAULT_PRESIGN_EXPIRES_SECONDS });
  }

  /**
   * Build a direct (non-signed) URL to the stored object.
   * Useful for public read buckets or when a CDN fronts the bucket.
   */
  private buildPublicUrl(key: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase.replace(/\/$/, '')}/${key}`;
    }
    if (this.endpoint) {
      const base = this.endpoint.replace(/\/$/, '');
      return this.forcePathStyle
        ? `${base}/${this.bucketName}/${key}`
        : `${base}/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private safeName(name: string): string {
    // Strip path separators, keep extension + basic chars.
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  }
}
