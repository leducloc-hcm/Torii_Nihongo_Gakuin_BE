package com.torii.assessment.service;

import com.torii.assessment.dto.option.*;
import com.torii.assessment.entity.Option;
import com.torii.assessment.entity.Question;
import com.torii.assessment.repository.OptionRepository;
import com.torii.assessment.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

import static com.torii.assessment.service.AuditLogService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OptionService {

    private final OptionRepository optionRepository;
    private final QuestionRepository questionRepository;
    private final S3Service s3Service;
    private final AuditLogService auditLogService;

    @Transactional
    public OptionResponseDTO createOption(Long questionId, CreateOptionDTO dto, MultipartFile image) {
        return createOption(questionId, dto, image, null);
    }

    @Transactional
    public OptionResponseDTO createOption(Long questionId, CreateOptionDTO dto, MultipartFile image, Integer updatedBy) {
        // Validate question exists
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        // Upload image to S3 if provided
        String mediaUrl = null;
        try {
            if (image != null && !image.isEmpty()) {
                mediaUrl = s3Service.uploadFile(image, "options/images");
                log.info("Uploaded option image: {}", mediaUrl);
            }
        } catch (IOException e) {
            log.error("Error uploading option image: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload option image", e);
        }

        // Get next order if not provided
        int order = dto.getOrder() != null ? dto.getOrder() :
            optionRepository.getMaxOrderByQuestionId(questionId) + 1;

        Option option = Option.builder()
            .questionId(questionId)
            .content(dto.getContent())
            .isCorrect(dto.getIsCorrect() != null ? dto.getIsCorrect() : false)
            .order(order)
            .mediaId(dto.getMediaId())
            .mediaUrl(mediaUrl)
            .build();

        Option saved = optionRepository.save(option);
        log.info("Created option {} for question {}", saved.getId(), questionId);

        if (updatedBy != null) {
            auditLogService.logAction(null, ENTITY_OPTION, saved.getId(),
                    ACTION_CREATE, null, null, null, updatedBy,
                    "Tạo option cho question bank #" + questionId, null);
        }

        return mapToResponseDTO(saved, question);
    }

    public Map<String, Object> findByQuestion(Long questionId, QueryOptionDTO queryDto) {
        // Validate question exists
        if (!questionRepository.existsById(questionId)) {
            throw new RuntimeException("Question not found: " + questionId);
        }

        int page = queryDto.getPage() != null ? queryDto.getPage() : 1;
        int limit = queryDto.getLimit() != null ? queryDto.getLimit() : 10;

        Sort sort = Sort.by(
            "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
            queryDto.getSortBy() != null ? queryDto.getSortBy() : "order"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Page<Option> optionPage = optionRepository.findByQuestionId(questionId, pageable);

        List<OptionResponseDTO> data = optionPage.getContent().stream()
            .map(opt -> mapToResponseDTO(opt, null))
            .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("data", data);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("total", optionPage.getTotalElements());
        pagination.put("totalPages", optionPage.getTotalPages());
        pagination.put("hasNext", optionPage.hasNext());
        pagination.put("hasPrev", optionPage.hasPrevious());
        result.put("pagination", pagination);

        return result;
    }

    public OptionResponseDTO getOptionById(Long id) {
        Option option = optionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Option not found: " + id));

        Question question = questionRepository.findById(option.getQuestionId()).orElse(null);
        return mapToResponseDTO(option, question);
    }

    @Transactional
    public OptionResponseDTO updateOption(Long id, UpdateOptionDTO dto, MultipartFile image) {
        return updateOption(id, dto, image, null);
    }

    @Transactional
    public OptionResponseDTO updateOption(Long id, UpdateOptionDTO dto, MultipartFile image, Integer updatedBy) {
        Option option = optionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Option not found: " + id));

        // If updating isCorrect to false, validate at least one correct option will remain
        if (Boolean.FALSE.equals(dto.getIsCorrect()) && Boolean.TRUE.equals(option.getIsCorrect())) {
            long correctCount = optionRepository.countByQuestionIdAndIsCorrectTrue(option.getQuestionId());
            if (correctCount <= 1) {
                throw new IllegalArgumentException("Cannot set option to incorrect. At least one correct option must remain.");
            }
        }

        // Upload new image if provided
        if (image != null && !image.isEmpty()) {
            try {
                String mediaUrl = s3Service.uploadFile(image, "options/images");
                option.setMediaUrl(mediaUrl);
                log.info("Uploaded updated option image: {}", mediaUrl);
            } catch (IOException e) {
                log.error("Error uploading option image: {}", e.getMessage(), e);
                throw new RuntimeException("Failed to upload option image", e);
            }
        }

        if (dto.getContent() != null) option.setContent(dto.getContent());
        if (dto.getIsCorrect() != null) option.setIsCorrect(dto.getIsCorrect());
        if (dto.getOrder() != null) option.setOrder(dto.getOrder());
        if (dto.getMediaId() != null) option.setMediaId(dto.getMediaId());

        Option saved = optionRepository.save(option);
        log.info("Updated option: {}", id);

        if (updatedBy != null) {
            auditLogService.logAction(null, ENTITY_OPTION, id,
                    ACTION_UPDATE, null, null, null, updatedBy,
                    "Cập nhật option bank #" + id, null);
        }

        Question question = questionRepository.findById(saved.getQuestionId()).orElse(null);
        return mapToResponseDTO(saved, question);
    }

    @Transactional
    public void deleteOption(Long id) {
        deleteOption(id, null);
    }

    @Transactional
    public void deleteOption(Long id, Integer updatedBy) {
        Option option = optionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Option not found: " + id));

        // If this is a correct option, validate at least one correct option will remain
        if (Boolean.TRUE.equals(option.getIsCorrect())) {
            long correctCount = optionRepository.countByQuestionIdAndIsCorrectTrue(option.getQuestionId());
            if (correctCount <= 1) {
                throw new IllegalArgumentException("Cannot delete this option. At least one correct option must remain.");
            }
        }

        // Check minimum options (at least 2 options per question)
        long totalOptions = optionRepository.countByQuestionId(option.getQuestionId());
        if (totalOptions <= 2) {
            throw new IllegalArgumentException("Cannot delete option. Each question must have at least 2 options.");
        }

        optionRepository.deleteById(id);

        if (updatedBy != null) {
            auditLogService.logAction(null, ENTITY_OPTION, id,
                    ACTION_DELETE, null, null, null, updatedBy,
                    "Xóa option bank #" + id, null);
        }

        log.info("Deleted option: {}", id);
    }

    @Transactional
    public List<OptionResponseDTO> bulkCreateOptions(Long questionId, BulkCreateOptionsDTO dto) {
        // Validate question exists
        Question question = questionRepository.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found: " + questionId));

        // Validate at least one correct option
        long correctCount = dto.getOptions().stream()
            .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
            .count();
        if (correctCount < 1) {
            throw new IllegalArgumentException("At least one option must be correct");
        }

        int nextOrder = optionRepository.getMaxOrderByQuestionId(questionId) + 1;

        List<Option> options = new ArrayList<>();
        for (int i = 0; i < dto.getOptions().size(); i++) {
            CreateOptionDTO optDto = dto.getOptions().get(i);
            Option option = Option.builder()
                .questionId(questionId)
                .content(optDto.getContent())
                .isCorrect(optDto.getIsCorrect() != null ? optDto.getIsCorrect() : false)
                .order(optDto.getOrder() != null ? optDto.getOrder() : nextOrder + i)
                .mediaId(optDto.getMediaId())
                .build();
            options.add(option);
        }

        List<Option> savedOptions = optionRepository.saveAll(options);
        log.info("Bulk created {} options for question {}", savedOptions.size(), questionId);

        return savedOptions.stream()
            .map(opt -> mapToResponseDTO(opt, question))
            .collect(Collectors.toList());
    }

    @Transactional
    public List<OptionResponseDTO> reorderOptions(Long questionId, ReorderOptionsDTO dto) {
        // Validate question exists
        if (!questionRepository.existsById(questionId)) {
            throw new RuntimeException("Question not found: " + questionId);
        }

        // Validate all options belong to the question
        List<Option> existingOptions = optionRepository.findByQuestionIdOrderByOrderAsc(questionId);
        Set<Long> existingIds = existingOptions.stream()
            .map(Option::getId)
            .collect(Collectors.toSet());

        for (ReorderOptionsDTO.ReorderItem item : dto.getOptions()) {
            if (!existingIds.contains(item.getId())) {
                throw new IllegalArgumentException("Option " + item.getId() + " does not belong to question " + questionId);
            }
        }

        // Update orders
        for (ReorderOptionsDTO.ReorderItem item : dto.getOptions()) {
            Option option = optionRepository.findById(item.getId())
                .orElseThrow(() -> new RuntimeException("Option not found: " + item.getId()));
            option.setOrder(item.getOrder());
            optionRepository.save(option);
        }

        log.info("Reordered options for question {}", questionId);

        // Return updated options
        List<Option> updatedOptions = optionRepository.findByQuestionIdOrderByOrderAsc(questionId);
        return updatedOptions.stream()
            .map(opt -> mapToResponseDTO(opt, null))
            .collect(Collectors.toList());
    }

    public Map<String, Object> getQuestionOptions(Long questionId) {
        // Validate question exists
        if (!questionRepository.existsById(questionId)) {
            throw new RuntimeException("Question not found: " + questionId);
        }

        List<Option> options = optionRepository.findByQuestionIdOrderByOrderAsc(questionId);
        long correctCount = options.stream()
            .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
            .count();

        Map<String, Object> result = new HashMap<>();
        result.put("total", options.size());
        result.put("correct", correctCount);
        result.put("options", options.stream()
            .map(opt -> mapToResponseDTO(opt, null))
            .collect(Collectors.toList()));

        return result;
    }

    @Transactional
    public void deleteAllByQuestion(Long questionId) {
        // Validate question exists
        if (!questionRepository.existsById(questionId)) {
            throw new RuntimeException("Question not found: " + questionId);
        }

        optionRepository.deleteAllByQuestionId(questionId);
        log.info("Deleted all options for question {}", questionId);
    }

    // Helper method
    private OptionResponseDTO mapToResponseDTO(Option option, Question question) {
        OptionResponseDTO.QuestionDTO questionDTO = null;
        if (question != null) {
            questionDTO = OptionResponseDTO.QuestionDTO.builder()
                .id(question.getId())
                .stem(question.getStem())
                .type(question.getType().name())
                .level(question.getLevel().name())
                .build();
        }

        return OptionResponseDTO.builder()
            .id(option.getId())
            .questionId(option.getQuestionId())
            .content(option.getContent())
            .isCorrect(option.getIsCorrect())
            .order(option.getOrder())
            .mediaId(option.getMediaId())
            .mediaUrl(option.getMediaUrl())
            .question(questionDTO)
            .build();
    }
}

