package com.torii.assessment.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class S3Service {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    private static final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList(".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp");
    private static final List<String> ALLOWED_AUDIO_EXTENSIONS = Arrays.asList(".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac");
    private static final List<String> ALLOWED_VIDEO_EXTENSIONS = Arrays.asList(".mp4", ".mov", ".avi", ".mkv", ".webm");
    
    private static final long MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
    private static final long MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB

    @Autowired
    public S3Service(@Autowired(required = false) S3Client s3Client) {
        this.s3Client = s3Client;
    }

    /**
     * Upload file to S3 and return the URL
     */
    public String uploadFile(MultipartFile file, String folder) throws IOException {
        if (s3Client == null) {
            log.warn("S3Client is not configured. Skipping file upload.");
            return null;
        }
        
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        // Validate file
        validateFile(file);

        // Generate unique file name
        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        String fileName = folder + "/" + UUID.randomUUID() + extension;

        // Upload to S3
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileName)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));

            log.info("Successfully uploaded file to S3: {}", fileName);

            // Return S3 URL
            return String.format("https://%s.s3.amazonaws.com/%s", bucketName, fileName);
        } catch (Exception e) {
            log.error("Error uploading file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    /**
     * Delete file from S3
     */
    public void deleteFile(String fileUrl) {
        if (s3Client == null) {
            log.warn("S3Client is not configured. Skipping file deletion.");
            return;
        }
        
        try {
            // Extract key from URL
            String key = extractKeyFromUrl(fileUrl);
            
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            
            log.info("Successfully deleted file from S3: {}", key);
        } catch (Exception e) {
            log.error("Error deleting file from S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from S3", e);
        }
    }

    /**
     * Validate file extension and size
     */
    private void validateFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        
        // Check extension
        if (!ALLOWED_IMAGE_EXTENSIONS.contains(extension) && 
            !ALLOWED_AUDIO_EXTENSIONS.contains(extension) && 
            !ALLOWED_VIDEO_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Invalid file extension: " + extension);
        }

        // Check file size
        long fileSize = file.getSize();
        if (ALLOWED_IMAGE_EXTENSIONS.contains(extension) && fileSize > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("Image file size exceeds 50MB limit");
        }
        if ((ALLOWED_AUDIO_EXTENSIONS.contains(extension) || ALLOWED_VIDEO_EXTENSIONS.contains(extension)) 
            && fileSize > MAX_MEDIA_SIZE) {
            throw new IllegalArgumentException("Media file size exceeds 100MB limit");
        }
    }

    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        int lastIndexOf = filename.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return "";
        }
        return filename.substring(lastIndexOf);
    }

    /**
     * Extract S3 key from URL
     */
    private String extractKeyFromUrl(String fileUrl) {
        // Format: https://bucket-name.s3.amazonaws.com/folder/filename.ext
        // or: https://s3.region.amazonaws.com/bucket-name/folder/filename.ext
        String[] parts = fileUrl.split(bucketName + "/");
        if (parts.length > 1) {
            return parts[1];
        }
        throw new IllegalArgumentException("Invalid S3 URL format");
    }
}
