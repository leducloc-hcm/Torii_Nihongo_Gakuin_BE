package com.torii.assessment.service;

import com.torii.assessment.dto.question.*;
import com.torii.assessment.entity.Option;
import com.torii.assessment.entity.Question;
import com.torii.assessment.repository.OptionRepository;
import com.torii.assessment.repository.QuestionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final OptionRepository optionRepository;
    private final S3Service s3Service;

    @Transactional
    public QuestionResponseDTO createQuestion(CreateQuestionDTO dto, MultipartFile image, MultipartFile audio) {
        // Upload files to S3 if provided
        String mediaUrl = null;
        try {
            if (image != null && !image.isEmpty()) {
                mediaUrl = s3Service.uploadFile(image, "questions/images");
                log.info("Uploaded image: {}", mediaUrl);
            } else if (audio != null && !audio.isEmpty()) {
                mediaUrl = s3Service.uploadFile(audio, "questions/audio");
                log.info("Uploaded audio: {}", mediaUrl);
            }
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file", e);
        }

        // Use uploaded URL or provided mediaId
        String finalMediaUrl = mediaUrl;

        // Validate options
        if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
            long correctCount = dto.getOptions().stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                .count();
            if (correctCount < 1) {
                throw new IllegalArgumentException("At least one option must be correct");
            }
        }

        Question question = Question.builder()
            .type(dto.getType())
            .level(dto.getLevel())
            .difficulty(dto.getDifficulty() != null ? dto.getDifficulty() : Question.Difficulty.MEDIUM)
            .stem(dto.getStem())
            .passage(dto.getPassage())
            .mediaId(dto.getMediaId())
            .mediaUrl(finalMediaUrl)
            .explanation(dto.getExplanation())
            .readingLength(dto.getReadingLength())
            .build();

        Question saved = questionRepository.save(question);
        log.info("Created question: {}", saved.getId());

        // Create options
        if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
            List<Option> options = new ArrayList<>();
            for (int i = 0; i < dto.getOptions().size(); i++) {
                CreateQuestionDTO.CreateOptionDTO optDto = dto.getOptions().get(i);
                Option option = Option.builder()
                    .questionId(saved.getId())
                    .content(optDto.getContent())
                    .isCorrect(optDto.getIsCorrect() != null ? optDto.getIsCorrect() : false)
                    .order(optDto.getOrder() != null ? optDto.getOrder() : i)
                    .mediaId(optDto.getMediaId())
                    .build();
                options.add(option);
            }
            optionRepository.saveAll(options);
        }

        return getQuestionById(saved.getId());
    }

    public Map<String, Object> getAllQuestions(QueryQuestionDTO queryDto) {
        int page = queryDto.getPage() != null ? queryDto.getPage() : 1;
        int limit = queryDto.getLimit() != null ? queryDto.getLimit() : 10;

        if (page < 1) {
            throw new IllegalArgumentException("Page must be greater than 0");
        }
        if (limit < 1 || limit > 100) {
            throw new IllegalArgumentException("Limit must be between 1 and 100");
        }

        Sort sort = Sort.by(
            "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
            queryDto.getSortBy() != null ? queryDto.getSortBy() : "createdAt"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<Question> spec = buildSpecification(queryDto);
        Page<Question> questionPage = questionRepository.findAll(spec, pageable);

        List<QuestionResponseDTO> data = questionPage.getContent().stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("data", data);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("total", questionPage.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", questionPage.getTotalPages());
        pagination.put("hasNext", questionPage.hasNext());
        pagination.put("hasPrev", questionPage.hasPrevious());
        result.put("pagination", pagination);

        return result;
    }

    public QuestionResponseDTO getQuestionById(Long id) {
        Question question = questionRepository.findByIdWithOptions(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        return mapToResponseDTO(question);
    }

    @Transactional
    public QuestionResponseDTO updateQuestion(Long id, UpdateQuestionDTO dto, MultipartFile image, MultipartFile audio) {
        Question question = questionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));

        // Upload new files if provided
        String newMediaUrl = null;
        try {
            if (image != null && !image.isEmpty()) {
                // Delete old media if exists
                if (question.getMediaUrl() != null && !question.getMediaUrl().isEmpty()) {
                    try {
                        s3Service.deleteFile(question.getMediaUrl());
                    } catch (Exception e) {
                        log.warn("Failed to delete old media: {}", e.getMessage());
                    }
                }
                newMediaUrl = s3Service.uploadFile(image, "questions/images");
                log.info("Uploaded new image: {}", newMediaUrl);
            } else if (audio != null && !audio.isEmpty()) {
                // Delete old media if exists
                if (question.getMediaUrl() != null && !question.getMediaUrl().isEmpty()) {
                    try {
                        s3Service.deleteFile(question.getMediaUrl());
                    } catch (Exception e) {
                        log.warn("Failed to delete old media: {}", e.getMessage());
                    }
                }
                newMediaUrl = s3Service.uploadFile(audio, "questions/audio");
                log.info("Uploaded new audio: {}", newMediaUrl);
            }
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file", e);
        }

        // Update fields if provided
        if (dto.getType() != null) question.setType(dto.getType());
        if (dto.getLevel() != null) question.setLevel(dto.getLevel());
        if (dto.getDifficulty() != null) question.setDifficulty(dto.getDifficulty());
        if (dto.getStem() != null) question.setStem(dto.getStem());
        if (dto.getPassage() != null) question.setPassage(dto.getPassage());
        if (newMediaUrl != null) {
            question.setMediaUrl(newMediaUrl);
        }
        if (dto.getMediaId() != null) {
            question.setMediaId(dto.getMediaId());
        }
        if (dto.getExplanation() != null) question.setExplanation(dto.getExplanation());
        if (dto.getReadingLength() != null) question.setReadingLength(dto.getReadingLength());

        questionRepository.save(question);
        log.info("Updated question: {}", id);

        // Update options if provided
        if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
            // Validate at least one correct
            long correctCount = dto.getOptions().stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
                .count();
            if (correctCount < 1) {
                throw new IllegalArgumentException("At least one option must be correct");
            }

            // Delete existing options and create new ones
            optionRepository.deleteAllByQuestionId(id);

            List<Option> options = new ArrayList<>();
            for (int i = 0; i < dto.getOptions().size(); i++) {
                UpdateQuestionDTO.UpdateOptionDTO optDto = dto.getOptions().get(i);
                Option option = Option.builder()
                    .questionId(id)
                    .content(optDto.getContent())
                    .isCorrect(optDto.getIsCorrect() != null ? optDto.getIsCorrect() : false)
                    .order(optDto.getOrder() != null ? optDto.getOrder() : i)
                    .mediaId(optDto.getMediaId())
                    .build();
                options.add(option);
            }
            optionRepository.saveAll(options);
        }

        return getQuestionById(id);
    }

    @Transactional
    public void deleteQuestion(Long id) {
        if (!questionRepository.existsById(id)) {
            throw new RuntimeException("Question not found: " + id);
        }
        questionRepository.deleteById(id);
        log.info("Deleted question: {}", id);
    }

    public QuestionStatsDTO getStatistics() {
        long total = questionRepository.count();

        Map<String, Long> byType = new HashMap<>();
        for (Question.QuestionType type : Question.QuestionType.values()) {
            byType.put(type.name(), questionRepository.countByType(type));
        }

        Map<String, Long> byLevel = new HashMap<>();
        for (Question.JLPTLevel level : Question.JLPTLevel.values()) {
            byLevel.put(level.name(), questionRepository.countByLevel(level));
        }

        Map<String, Long> byDifficulty = new HashMap<>();
        for (Question.Difficulty difficulty : Question.Difficulty.values()) {
            byDifficulty.put(difficulty.name(), questionRepository.countByDifficulty(difficulty));
        }

        return QuestionStatsDTO.builder()
            .totalQuestions(total)
            .byType(byType)
            .byLevel(byLevel)
            .byDifficulty(byDifficulty)
            .withMedia(questionRepository.countByMediaIdIsNotNull())
            .withoutMedia(questionRepository.countByMediaIdIsNull())
            .build();
    }

    @Transactional
    public List<QuestionResponseDTO> bulkCreateQuestions(BulkCreateQuestionsDTO dto) {
        List<QuestionResponseDTO> results = new ArrayList<>();
        for (CreateQuestionDTO questionDto : dto.getQuestions()) {
            results.add(createQuestion(questionDto, null, null));
        }
        return results;
    }

    public Map<String, Object> findByType(Question.QuestionType type, QueryQuestionDTO queryDto) {
        queryDto.setType(type);
        return getAllQuestions(queryDto);
    }

    public Map<String, Object> findByLevel(Question.JLPTLevel level, QueryQuestionDTO queryDto) {
        queryDto.setLevel(level);
        return getAllQuestions(queryDto);
    }

    public Map<String, Object> findByDifficulty(Question.Difficulty difficulty, QueryQuestionDTO queryDto) {
        queryDto.setDifficulty(difficulty);
        return getAllQuestions(queryDto);
    }

    // Versioning methods
    public List<QuestionResponseDTO> getQuestionVersions(String uuid) {
        List<Question> versions = questionRepository.findByUuidOrderByVersionDesc(uuid);
        if (versions.isEmpty()) {
            throw new RuntimeException("No questions found with UUID: " + uuid);
        }
        return versions.stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());
    }

    public QuestionResponseDTO getQuestionByVersion(String uuid, Integer version) {
        Question question = questionRepository.findByUuidAndVersion(uuid, version)
            .orElseThrow(() -> new RuntimeException("Question not found with UUID " + uuid + " and version " + version));
        return mapToResponseDTO(question);
    }

    @Transactional
    public QuestionResponseDTO cloneQuestion(Long id, UpdateQuestionDTO modifications) {
        Question original = questionRepository.findByIdWithOptions(id)
            .orElseThrow(() -> new RuntimeException("Question not found: " + id));

        // Get latest version
        Integer latestVersion = questionRepository.findByUuidOrderByVersionDesc(original.getUuid())
            .stream()
            .findFirst()
            .map(Question::getVersion)
            .orElse(0);

        Question clone = Question.builder()
            .uuid(original.getUuid())
            .version(latestVersion + 1)
            .type(modifications.getType() != null ? modifications.getType() : original.getType())
            .level(modifications.getLevel() != null ? modifications.getLevel() : original.getLevel())
            .difficulty(modifications.getDifficulty() != null ? modifications.getDifficulty() : original.getDifficulty())
            .stem(modifications.getStem() != null ? modifications.getStem() : original.getStem())
            .passage(modifications.getPassage() != null ? modifications.getPassage() : original.getPassage())
            .mediaId(modifications.getMediaId() != null ? modifications.getMediaId() : original.getMediaId())
            .mediaUrl(original.getMediaUrl())
            .explanation(modifications.getExplanation() != null ? modifications.getExplanation() : original.getExplanation())
            .readingLength(modifications.getReadingLength() != null ? modifications.getReadingLength() : original.getReadingLength())
            .build();

        Question saved = questionRepository.save(clone);

        // Clone or create options
        List<Option> originalOptions = optionRepository.findByQuestionIdOrderByOrderAsc(id);
        if (modifications.getOptions() != null && !modifications.getOptions().isEmpty()) {
            for (int i = 0; i < modifications.getOptions().size(); i++) {
                UpdateQuestionDTO.UpdateOptionDTO optDto = modifications.getOptions().get(i);
                Option option = Option.builder()
                    .questionId(saved.getId())
                    .content(optDto.getContent())
                    .isCorrect(optDto.getIsCorrect() != null ? optDto.getIsCorrect() : false)
                    .order(optDto.getOrder() != null ? optDto.getOrder() : i)
                    .mediaId(optDto.getMediaId())
                    .build();
                optionRepository.save(option);
            }
        } else {
            for (Option opt : originalOptions) {
                Option clonedOpt = Option.builder()
                    .questionId(saved.getId())
                    .content(opt.getContent())
                    .isCorrect(opt.getIsCorrect())
                    .order(opt.getOrder())
                    .mediaId(opt.getMediaId())
                    .build();
                optionRepository.save(clonedOpt);
            }
        }

        log.info("Cloned question {} to new version {}", id, saved.getId());
        return getQuestionById(saved.getId());
    }

    public Map<String, Object> checkQuestionUsage(Long id) {
        if (!questionRepository.existsById(id)) {
            throw new RuntimeException("Question not found: " + id);
        }

        // TODO: Check actual usage in assessments and quizzes
        boolean isUsed = false;

        Map<String, Object> result = new HashMap<>();
        result.put("canEdit", !isUsed);
        result.put("canDelete", !isUsed);

        Map<String, Boolean> usageDetails = new HashMap<>();
        usageDetails.put("inAssessments", isUsed);
        usageDetails.put("inQuizzes", isUsed);
        usageDetails.put("hasAnswers", isUsed);
        result.put("usageDetails", usageDetails);

        return result;
    }

    // Helper methods
    private Specification<Question> buildSpecification(QueryQuestionDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getType() != null) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            if (queryDto.getLevel() != null) {
                predicates.add(cb.equal(root.get("level"), queryDto.getLevel()));
            }
            if (queryDto.getDifficulty() != null) {
                predicates.add(cb.equal(root.get("difficulty"), queryDto.getDifficulty()));
            }
            if (queryDto.getReadingLength() != null) {
                predicates.add(cb.equal(root.get("readingLength"), queryDto.getReadingLength()));
            }
            if (queryDto.getKeyword() != null && !queryDto.getKeyword().isEmpty()) {
                String keyword = "%" + queryDto.getKeyword().toLowerCase() + "%";
                Predicate stemPred = cb.like(cb.lower(root.get("stem")), keyword);
                Predicate passagePred = cb.like(cb.lower(root.get("passage")), keyword);
                Predicate expPred = cb.like(cb.lower(root.get("explanation")), keyword);
                predicates.add(cb.or(stemPred, passagePred, expPred));
            }
            if (queryDto.getHasMedia() != null) {
                if (queryDto.getHasMedia()) {
                    predicates.add(cb.or(
                        cb.isNotNull(root.get("mediaId")),
                        cb.isNotNull(root.get("mediaUrl"))
                    ));
                } else {
                    predicates.add(cb.and(
                        cb.isNull(root.get("mediaId")),
                        cb.isNull(root.get("mediaUrl"))
                    ));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private QuestionResponseDTO mapToResponseDTO(Question question) {
        List<Option> options = optionRepository.findByQuestionIdOrderByOrderAsc(question.getId());

        List<QuestionResponseDTO.OptionDTO> optionDTOs = options.stream()
            .map(opt -> QuestionResponseDTO.OptionDTO.builder()
                .id(opt.getId())
                .content(opt.getContent())
                .isCorrect(opt.getIsCorrect())
                .order(opt.getOrder())
                .mediaId(opt.getMediaId())
                .mediaUrl(opt.getMediaUrl())
                .build())
            .collect(Collectors.toList());

        long correctCount = options.stream()
            .filter(opt -> Boolean.TRUE.equals(opt.getIsCorrect()))
            .count();

        return QuestionResponseDTO.builder()
            .id(question.getId())
            .uuid(question.getUuid())
            .version(question.getVersion())
            .type(question.getType())
            .level(question.getLevel())
            .difficulty(question.getDifficulty())
            .stem(question.getStem())
            .passage(question.getPassage())
            .mediaId(question.getMediaId())
            .mediaUrl(question.getMediaUrl())
            .explanation(question.getExplanation())
            .readingLength(question.getReadingLength())
            .createdAt(question.getCreatedAt())
            .updatedAt(question.getUpdatedAt())
            .options(optionDTOs)
            .optionsCount(options.size())
            .correctOptionsCount((int) correctCount)
            .hasMedia(question.getMediaId() != null || question.getMediaUrl() != null)
            .build();
    }
}

