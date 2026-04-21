const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const { AppError } = require('@messagemesh/middleware').errorHandler;
const logger = require('@messagemesh/middleware').logger;
const { createFile, getFile, getUserFiles, getUserFileCount, deleteFile } = require('../models/media');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'application/pdf',
];

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400, 'NO_FILE');
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new AppError(`File type ${req.file.mimetype} not allowed`, 400, 'INVALID_MIME_TYPE');
    }

    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
    const ext = path.extname(req.file.originalname).toLowerCase();
    const storedName = `${uuidv4()}${ext}`;
    const newPath = path.join(uploadDir, storedName);

    fs.renameSync(req.file.path, newPath);

    const fileUrl = `/media/serve/${uuidv4()}`;
    const file = await createFile(
      req.userId,
      req.file.originalname,
      storedName,
      req.file.size,
      req.file.mimetype,
      fileUrl
    );

    await publishEvent(eventNames.MEDIA_UPLOADED, {
      fileId: file.id,
      uploadedBy: req.userId,
      mimeType: file.mime_type,
      fileSize: file.file_size,
      url: file.url,
      timestamp: new Date(),
    });

    res.status(201).json({
      id: file.id,
      url: file.url,
      originalName: file.original_name,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      createdAt: file.created_at,
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

const getFileMetadata = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await getFile(fileId);

    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    res.status(200).json({
      id: file.id,
      originalName: file.original_name,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      url: file.url,
      createdAt: file.created_at,
      uploadedBy: file.uploaded_by,
    });
  } catch (error) {
    next(error);
  }
};

const serveFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const file = await getFile(fileId);

    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
    const filePath = path.join(uploadDir, file.stored_name);

    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found on disk', 404, 'FILE_NOT_FOUND');
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Length', file.file_size);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

const deleteFileHandler = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;

    const file = await getFile(fileId);

    if (!file) {
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }

    if (file.uploaded_by !== userId) {
      throw new AppError('Only the uploader can delete this file', 403, 'NOT_UPLOADER');
    }

    const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
    const filePath = path.join(uploadDir, file.stored_name);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.error({
        message: 'Error deleting physical file',
        fileId,
        error: err.message,
        service: 'media-service',
      });
    }

    await deleteFile(fileId);

    await publishEvent(eventNames.MEDIA_DELETED, {
      fileId,
      deletedBy: userId,
      timestamp: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFileMetadata,
  serveFile,
  deleteFile: deleteFileHandler,
};
