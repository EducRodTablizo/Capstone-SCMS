import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { GridFsStorage } from 'multer-gridfs-storage';
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';

// Support both service directory .env and monorepo root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://scms_admin:scms_mongo_pass_2026@scms-mongo:27017/scms_documents?authSource=admin';

let mongoClient: MongoClient | null = null;
let isConnected = false;

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI);
  }
  if (!isConnected) {
    await mongoClient.connect();
    isConnected = true;
    console.log('Connected to MongoDB GridFS (scms_documents)');
  }
  return mongoClient;
}

export async function getGridFSBucket(): Promise<GridFSBucket | null> {
  try {
    const client = await getMongoClient();
    const db = client.db('scms_documents');
    return new GridFSBucket(db, { bucketName: 'fs' });
  } catch (err: any) {
    console.warn('[GridFS] Bucket unavailable:', err.message);
    return null;
  }
}

// Multer GridFS Storage configuration
export const gridFsStorage = new GridFsStorage({
  url: MONGO_URI,
  file: (_req, file) => {
    return {
      filename: file.originalname,
      bucketName: 'fs',
      metadata: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
    };
  },
});

export const upload = multer({
  storage: gridFsStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    if (ext.endsWith('.pdf') || ext.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid format. Only PDF and DOCX documents are accepted.`));
    }
  },
});

/**
 * Middleware wrapper to handle Multer upload and return clean JSON errors on violation
 */
export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File size exceeds 25MB limit.' });
          return;
        }
        res.status(400).json({ error: err.message || 'File upload error.' });
        return;
      }
      if (!req.body) {
        req.body = {};
      }
      next();
    });
  } else {
    if (!req.body) {
      req.body = {};
    }
    next();
  }
}

/**
 * Helper to download and stream a file from MongoDB GridFS
 */
export async function downloadFileFromGridFS(fileId: string): Promise<{
  stream: NodeJS.ReadableStream;
  filename: string;
  contentType: string;
  length: number;
} | null> {
  try {
    const client = await getMongoClient();
    const db = client.db('scms_documents');
    const bucket = new GridFSBucket(db, { bucketName: 'fs' });

    let objectId: ObjectId | null = null;
    if (ObjectId.isValid(fileId)) {
      objectId = new ObjectId(fileId);
    }

    const filter = objectId ? { _id: objectId } : { filename: fileId };
    const files = await db.collection('fs.files').find(filter).toArray();

    if (!files || files.length === 0) {
      return null;
    }

    const targetFile = files[0];
    const stream = bucket.openDownloadStream(targetFile._id);
    const contentType =
      (targetFile.metadata && targetFile.metadata.mimetype) ||
      (targetFile.filename.endsWith('.pdf')
        ? 'application/pdf'
        : targetFile.filename.endsWith('.docx')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream');

    return {
      stream,
      filename: targetFile.filename,
      contentType,
      length: targetFile.length,
    };
  } catch (err: any) {
    console.error('[GridFS] downloadFileFromGridFS error:', err.message);
    return null;
  }
}

