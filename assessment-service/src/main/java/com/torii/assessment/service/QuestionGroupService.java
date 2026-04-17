package com.torii.assessment.service;

import com.torii.assessment.dto.questiongroup.*;
import com.torii.assessment.entity.Option;
import com.torii.assessment.entity.Question;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.QuestionGroupQuestion;
import com.torii.assessment.repository.OptionRepository;
import com.torii.assessment.repository.QuestionGroupQuestionRepository;
import com.torii.assessment.repository.QuestionGroupRepository;
import com.torii.assessment.repository.QuestionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionGroupService {

    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionGroupQuestionRepository questionGroupQuestionRepository;
    private final QuestionRepository questionRepository;
    private final OptionRepository optionRepository;
    private final S3Service s3Service;

    @Transactional
    public QuestionGroupResponseDTO createQuestionGroup(CreateQuestionGroupDTO dto, MultipartFile image, MultipartFile audio) throws IOException {
        String mediaUrl = dto.getMediaUrl();
        if (image != null && !image.isEmpty()) {
            mediaUrl = s3Service.uploadFile(image, "question-groups/images");
        }

        String audioUrl = dto.getAudioUrl();
        if (audio != null && !audio.isEmpty()) {
            audioUrl = s3Service.uploadFile(audio, "question-groups/audio");
        }

        QuestionGroup group = QuestionGroup.builder()
            .type(dto.getType())
            .level(dto.getLevel())
            .difficulty(dto.getDifficulty())
            .stem(dto.getStem())
            .passage(dto.getPassage())
            .explanation(dto.getExplanation())
            .mediaUrl(mediaUrl)
            .audioUrl(audioUrl)
            .build();

        QuestionGroup saved = questionGroupRepository.save(group);
        log.info("Created question group: {}", saved.getId());

        // Add questions if provided
        List<Long> questionIds = resolveQuestionIds(dto.getQuestions(), dto.getQuestionIds());
        if (!questionIds.isEmpty()) {
            validateQuestionsExist(questionIds);
            addQuestionsToGroupInternal(saved.getId(), questionIds);
        }

        return getQuestionGroupById(saved.getId());
    }

    public Map<String, Object> getAllQuestionGroups(QueryQuestionGroupDTO queryDto) {
        int page = queryDto.getPage() != null ? queryDto.getPage() : 1;
        int limit = queryDto.getLimit() != null ? queryDto.getLimit() : 10;

        Sort sort = Sort.by(
            "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
            queryDto.getSortBy() != null ? queryDto.getSortBy() : "createdAt"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<QuestionGroup> spec = buildSpecification(queryDto);
        Page<QuestionGroup> groupPage = questionGroupRepository.findAll(spec, pageable);

        List<QuestionGroupResponseDTO> data = groupPage.getContent().stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", groupPage.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", groupPage.getTotalPages());
        pagination.put("hasNext", groupPage.hasNext());
        pagination.put("hasPrev", groupPage.hasPrevious());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("data", data);
        result.put("pagination", pagination);

        return result;
    }

    public QuestionGroupResponseDTO getQuestionGroupById(Long id) {
        QuestionGroup group = questionGroupRepository.findByIdWithQuestions(id)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + id));
        return mapToResponseDTO(group);
    }

    @Transactional
    public QuestionGroupResponseDTO updateQuestionGroup(Long id, UpdateQuestionGroupDTO dto, MultipartFile image, MultipartFile audio) throws IOException {
        if (dto.getQuestionGroupId() != null && !dto.getQuestionGroupId().equals(id)) {
            throw new RuntimeException("questionGroupId in payload does not match path id");
        }

        QuestionGroup group = questionGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + id));

        if (image != null && !image.isEmpty()) {
            String uploadedUrl = s3Service.uploadFile(image, "question-groups/images");
            group.setMediaUrl(uploadedUrl);
        } else if (dto.getMediaUrl() != null) {
            group.setMediaUrl(dto.getMediaUrl());
        }

        if (audio != null && !audio.isEmpty()) {
            String uploadedAudioUrl = s3Service.uploadFile(audio, "question-groups/audio");
            group.setAudioUrl(uploadedAudioUrl);
        } else if (dto.getAudioUrl() != null) {
            group.setAudioUrl(dto.getAudioUrl());
        }

        if (dto.getType() != null) group.setType(dto.getType());
        if (dto.getLevel() != null) group.setLevel(dto.getLevel());
        if (dto.getDifficulty() != null) group.setDifficulty(dto.getDifficulty());
        if (dto.getStem() != null) group.setStem(dto.getStem());
        if (dto.getPassage() != null) group.setPassage(dto.getPassage());
        if (dto.getExplanation() != null) group.setExplanation(dto.getExplanation());

        questionGroupRepository.save(group);
        log.info("Updated question group: {}", id);

        // Update questions if provided
        List<Long> questionIds = resolveQuestionIds(dto.getQuestions(), dto.getQuestionIds());
        if (dto.getQuestions() != null || dto.getQuestionIds() != null) {
            questionGroupQuestionRepository.deleteAllByGroupId(id);
            if (!questionIds.isEmpty()) {
                validateQuestionsExist(questionIds);
                addQuestionsToGroupInternal(id, questionIds);
            }
        }

        return getQuestionGroupById(id);
    }

    @Transactional
    public void deleteQuestionGroup(Long id) {
        if (!questionGroupRepository.existsById(id)) {
            throw new RuntimeException("Question Group not found: " + id);
        }
        questionGroupRepository.deleteById(id);
        log.info("Deleted question group: {}", id);
    }

    @Transactional
    public QuestionGroupResponseDTO addQuestionsToGroup(Long groupId, AddQuestionsToGroupDTO dto) {
        if (!questionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Question Group not found: " + groupId);
        }

        // Validate questions exist
        List<Long> questionIds = resolveQuestionIds(dto.getQuestions(), dto.getQuestionIds());
        validateQuestionsExist(questionIds);

        addQuestionsToGroupInternal(groupId, questionIds);
        return getQuestionGroupById(groupId);
    }

    @Transactional
    public QuestionGroupResponseDTO removeQuestionsFromGroup(Long groupId, RemoveQuestionsFromGroupDTO dto) {
        if (!questionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Question Group not found: " + groupId);
        }

        List<Long> questionIds = resolveQuestionIds(dto.getQuestions(), dto.getQuestionIds());
        questionGroupQuestionRepository.deleteByGroupIdAndQuestionIds(groupId, questionIds);
        log.info("Removed {} questions from group {}", questionIds.size(), groupId);

        return getQuestionGroupById(groupId);
    }

    public Map<String, Object> getGroupQuestions(Long groupId) {
        QuestionGroup group = questionGroupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + groupId));

        List<QuestionGroupQuestion> qgqs = questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(groupId);

        List<QuestionGroupResponseDTO.QuestionDTO> questions = qgqs.stream()
            .map(qgq -> {
                Question q = qgq.getQuestion();
                return QuestionGroupResponseDTO.QuestionDTO.builder()
                    .id(q.getId())
                    .stem(q.getStem())
                    .type(q.getType().name())
                    .level(q.getLevel().name())
                    .difficulty(q.getDifficulty().name())
                    .order(qgq.getOrder())
                    .score(qgq.getScore())
                    .build();
            })
            .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        Map<String, Object> groupInfo = new HashMap<>();
        groupInfo.put("id", group.getId());
        groupInfo.put("type", group.getType());
        groupInfo.put("stem", group.getStem());
        result.put("group", groupInfo);
        result.put("questions", questions);
        result.put("questionsCount", questions.size());

        return result;
    }

    public Map<String, Object> getStatistics() {
        long total = questionGroupRepository.count();

        Map<String, Long> byType = new HashMap<>();
        for (QuestionGroup.QuestionGroupType type : QuestionGroup.QuestionGroupType.values()) {
            byType.put(type.name(), questionGroupRepository.countByType(type));
        }

        // Calculate average questions per group
        List<QuestionGroup> allGroups = questionGroupRepository.findAll();
        double avgQuestionsPerGroup = 0;
        if (!allGroups.isEmpty()) {
            long totalQuestions = allGroups.stream()
                .mapToLong(g -> questionGroupQuestionRepository.countByGroupId(g.getId()))
                .sum();
            avgQuestionsPerGroup = Math.round((double) totalQuestions / allGroups.size() * 100) / 100.0;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("totalGroups", total);
        result.put("byType", byType);
        result.put("withMedia", questionGroupRepository.countByMediaUrlIsNotNull());
        result.put("withoutMedia", questionGroupRepository.countByMediaUrlIsNull());
        result.put("withPassage", questionGroupRepository.countByPassageIsNotNull());
        result.put("withoutPassage", questionGroupRepository.countByPassageIsNull());
        result.put("averageQuestionsPerGroup", avgQuestionsPerGroup);

        return result;
    }

    public Map<String, Object> findByType(QuestionGroup.QuestionGroupType type, QueryQuestionGroupDTO queryDto) {
        queryDto.setType(type);
        return getAllQuestionGroups(queryDto);
    }

    public Map<String, Object> checkQuestionGroupUsage(Long id) {
        if (!questionGroupRepository.existsById(id)) {
            throw new RuntimeException("Question Group not found: " + id);
        }

        boolean isUsed = false; // TODO: Check actual usage

        Map<String, Object> result = new HashMap<>();
        result.put("canEdit", !isUsed);
        result.put("canDelete", !isUsed);

        Map<String, Boolean> usageDetails = new HashMap<>();
        usageDetails.put("inAssessments", isUsed);
        usageDetails.put("inQuizzes", isUsed);
        result.put("usageDetails", usageDetails);

        return result;
    }

    // Helper methods
    private void addQuestionsToGroupInternal(Long groupId, List<Long> questionIds) {
        Integer maxOrder = questionGroupQuestionRepository.getMaxOrderByGroupId(groupId);
        int startOrder = (maxOrder != null ? maxOrder : 0) + 1;

        List<QuestionGroupQuestion> relations = new ArrayList<>();
        for (int i = 0; i < questionIds.size(); i++) {
            Long questionId = questionIds.get(i);
            if (!questionGroupQuestionRepository.existsByGroupIdAndQuestionId(groupId, questionId)) {
                QuestionGroupQuestion qgq = QuestionGroupQuestion.builder()
                    .groupId(groupId)
                    .questionId(questionId)
                    .order(startOrder + i)
                    .build();
                relations.add(qgq);
            }
        }
        questionGroupQuestionRepository.saveAll(relations);
    }

    private void validateQuestionsExist(List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            throw new RuntimeException("At least one question id is required");
        }
        for (Long questionId : questionIds) {
            if (!questionRepository.existsById(questionId)) {
                throw new RuntimeException("Question not found: " + questionId);
            }
        }
    }

    private List<Long> resolveQuestionIds(List<Long> questions, List<Long> questionIds) {
        LinkedHashSet<Long> merged = new LinkedHashSet<>();
        if (questions != null) merged.addAll(questions);
        if (questionIds != null) merged.addAll(questionIds);
        return new ArrayList<>(merged);
    }

    private Specification<QuestionGroup> buildSpecification(QueryQuestionGroupDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getType() != null) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            if (queryDto.getHasMedia() != null) {
                if (queryDto.getHasMedia()) {
                    predicates.add(cb.isNotNull(root.get("mediaUrl")));
                } else {
                    predicates.add(cb.isNull(root.get("mediaUrl")));
                }
            }
            if (queryDto.getHasPassage() != null) {
                if (queryDto.getHasPassage()) {
                    predicates.add(cb.isNotNull(root.get("passage")));
                } else {
                    predicates.add(cb.isNull(root.get("passage")));
                }
            }
            if (queryDto.getKeyword() != null && !queryDto.getKeyword().isEmpty()) {
                String keyword = "%" + queryDto.getKeyword().toLowerCase() + "%";
                Predicate stemPred = cb.like(cb.lower(root.get("stem")), keyword);
                Predicate passagePred = cb.like(cb.lower(root.get("passage")), keyword);
                Predicate explanationPred = cb.like(cb.lower(root.get("explanation")), keyword);
                predicates.add(cb.or(stemPred, passagePred, explanationPred));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private QuestionGroupResponseDTO mapToResponseDTO(QuestionGroup group) {
        List<QuestionGroupQuestion> qgqs = questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(group.getId());

        // Batch-load questions to avoid Hibernate first-level cache returning stale entities with null question
        List<Long> qIds = qgqs.stream().map(QuestionGroupQuestion::getQuestionId).collect(Collectors.toList());
        Map<Long, Question> questionsById = qIds.isEmpty() ? Collections.emptyMap() :
            questionRepository.findAllById(qIds).stream().collect(Collectors.toMap(Question::getId, q -> q));

        List<QuestionGroupResponseDTO.QuestionDTO> questionDTOs = qgqs.stream()
            .map(qgq -> {
                Question q = questionsById.get(qgq.getQuestionId());
                if (q == null) return null;
                List<QuestionGroupResponseDTO.OptionDTO> optionDTOs = optionRepository
                    .findByQuestionIdOrderByOrderAsc(q.getId()).stream()
                    .map(opt -> QuestionGroupResponseDTO.OptionDTO.builder()
                        .id(opt.getId())
                        .content(opt.getContent())
                        .isCorrect(opt.getIsCorrect())
                        .order(opt.getOrder())
                        .mediaUrl(opt.getMediaUrl())
                        .build())
                    .collect(Collectors.toList());
                return QuestionGroupResponseDTO.QuestionDTO.builder()
                    .id(q.getId())
                    .stem(q.getStem())
                    .type(q.getType().name())
                    .level(q.getLevel().name())
                    .difficulty(q.getDifficulty().name())
                    .order(qgq.getOrder())
                    .score(qgq.getScore())
                    .options(optionDTOs)
                    .build();
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return QuestionGroupResponseDTO.builder()
            .id(group.getId())
            .questionGroupId(group.getId())
            .type(group.getType())
            .level(group.getLevel() != null ? group.getLevel().name() : null)
            .difficulty(group.getDifficulty() != null ? group.getDifficulty().name() : null)
            .stem(group.getStem())
            .passage(group.getPassage())
            .explanation(group.getExplanation())
            .mediaUrl(group.getMediaUrl())
            .audioUrl(group.getAudioUrl())
            .createdAt(group.getCreatedAt())
            .questionIds(questionDTOs.stream().map(QuestionGroupResponseDTO.QuestionDTO::getId).collect(Collectors.toList()))
            .questions(questionDTOs)
            .questionsCount(questionDTOs.size())
            .hasMedia(group.getMediaUrl() != null && !group.getMediaUrl().isEmpty())
            .hasPassage(group.getPassage() != null && !group.getPassage().isEmpty())
            .build();
    }
}

