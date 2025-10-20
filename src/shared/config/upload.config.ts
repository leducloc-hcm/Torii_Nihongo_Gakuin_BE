import * as multer from 'multer'
import * as path from 'path'
import { InvalidFileExtensionError } from '../error'

export const imageUploadOptions: multer.Options = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowed = ['.png', '.jpg', '.jpeg']
    if (!allowed.includes(ext)) {
      return cb(new InvalidFileExtensionError('INVALID_FILE_EXTENSION') as any, false)
    }
    cb(null, true)
  },
}

export const mediaUploadOptions: multer.Options = {
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for media files
  fileFilter: (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowedImages = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    const allowedAudio = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
    const allowedVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm']

    const allAllowed = [...allowedImages, ...allowedAudio, ...allowedVideo]

    if (!allAllowed.includes(ext)) {
      return cb(new InvalidFileExtensionError('INVALID_FILE_EXTENSION') as any, false)
    }
    cb(null, true)
  },
}
