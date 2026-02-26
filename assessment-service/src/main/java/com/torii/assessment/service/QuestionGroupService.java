package com.torii.assessment.service;

import com.torii.assessment.dto.questiongroup.*;
import com.torii.assessment.entity.Question;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.QuestionGroupQuestion;
import com.torii.assessment.repository.QuestionGroupQuestionRepository;
import com.torii.assessment.repository.QuestionGroupRepository;
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

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionGroupService {

    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionGroupQuestionRepository questionGroupQuestionRepository;
    private final QuestionRepository questionRepository;

    @Transactional
    public QuestionGroupResponseDTO createQuestionGroup(CreateQuestionGroupDTO dto) {
        QuestionGroup group = QuestionGroup.builder()
            .type(dto.getType())
            .title(dto.getTitle())
            .passage(dto.getPassage())
            .mediaId(dto.getMediaId())
            .order(dto.getOrder())
            .metadata(dto.getMetadata() != null ? dto.getMetadata().toString() : null)
            .build();

        QuestionGroup saved = questionGroupRepository.save(group);
        log.info("Created question group: {}", saved.getId());

        // Add questions if provided
        if (dto.getQuestions() != null && !dto.getQuestions().isEmpty()) {
            addQuestionsToGroupInternal(saved.getId(), dto.getQuestions());
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

        Map<String, Object> result = new HashMap<>();
        result.put("data", data);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("total", groupPage.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", groupPage.getTotalPages());
        pagination.put("hasNext", groupPage.hasNext());
        pagination.put("hasPrev", groupPage.hasPrevious());
        result.put("pagination", pagination);

        return result;
    }

    public QuestionGroupResponseDTO getQuestionGroupById(Long id) {
        QuestionGroup group = questionGroupRepository.findByIdWithQuestions(id)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + id));
        return mapToResponseDTO(group);
    }

    @Transactional
    public QuestionGroupResponseDTO updateQuestionGroup(Long id, UpdateQuestionGroupDTO dto) {
        QuestionGroup group = questionGroupRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + id));

        if (dto.getType() != null) group.setType(dto.getType());
        if (dto.getTitle() != null) group.setTitle(dto.getTitle());
        if (dto.getPassage() != null) group.setPassage(dto.getPassage());
        if (dto.getMediaId() != null) group.setMediaId(dto.getMediaId());
        if (dto.getOrder() != null) group.setOrder(dto.getOrder());
        if (dto.getMetadata() != null) group.setMetadata(dto.getMetadata().toString());

        questionGroupRepository.save(group);
        log.info("Updated question group: {}", id);

        // Update questions if provided
        if (dto.getQuestions() != null) {
            questionGroupQuestionRepository.deleteAllByGroupId(id);
            if (!dto.getQuestions().isEmpty()) {
                addQuestionsToGroupInternal(id, dto.getQuestions());
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
        validateQuestionsExist(dto.getQuestionIds());

        addQuestionsToGroupInternal(groupId, dto.getQuestionIds());
        return getQuestionGroupById(groupId);
    }

    @Transactional
    public QuestionGroupResponseDTO removeQuestionsFromGroup(Long groupId, RemoveQuestionsFromGroupDTO dto) {
        if (!questionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Question Group not found: " + groupId);
        }

        questionGroupQuestionRepository.deleteByGroupIdAndQuestionIds(groupId, dto.getQuestionIds());
        log.info("Removed {} questions from group {}", dto.getQuestionIds().size(), groupId);

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
        groupInfo.put("title", group.getTitle());
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
        result.put("withMedia", questionGroupRepository.countByMediaIdIsNotNull());
        result.put("withoutMedia", questionGroupRepository.countByMediaIdIsNull());
        result.put("withPassage", questionGroupRepository.countByPassageIsNotNull());
        result.put("withoutPassage", questionGroupRepository.countByPassageIsNull());
        result.put("averageQuestionsPerGroup", avgQuestionsPerGroup);

        return result;
    }

    public Map<String, Object> findByType(QuestionGroup.QuestionGroupType type, QueryQuestionGroupDTO queryDto) {
        queryDto.setType(type);
        return getAllQuestionGroups(queryDto);
    }

    // Versioning methods
    public List<QuestionGroupResponseDTO> getQuestionGroupVersions(String uuid) {
        List<QuestionGroup> versions = questionGroupRepository.findByUuidOrderByVersionDesc(uuid);
        if (versions.isEmpty()) {
            throw new RuntimeException("No question groups found with UUID: " + uuid);
        }
        return versions.stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());
    }

    public QuestionGroupResponseDTO getQuestionGroupByVersion(String uuid, Integer version) {
        QuestionGroup group = questionGroupRepository.findByUuidAndVersion(uuid, version)
            .orElseThrow(() -> new RuntimeException("Question Group not found with UUID " + uuid + " and version " + version));
        return mapToResponseDTO(group);
    }

    @Transactional
    public QuestionGroupResponseDTO cloneQuestionGroup(Long id, UpdateQuestionGroupDTO modifications) {
        QuestionGroup original = questionGroupRepository.findByIdWithQuestions(id)
            .orElseThrow(() -> new RuntimeException("Question Group not found: " + id));

        Integer latestVersion = questionGroupRepository.findByUuidOrderByVersionDesc(original.getUuid())
            .stream()
            .findFirst()
            .map(QuestionGroup::getVersion)
            .orElse(0);

        QuestionGroup clone = QuestionGroup.builder()
            .uuid(original.getUuid())
            .version(latestVersion + 1)
            .type(modifications.getType() != null ? modifications.getType() : original.getType())
            .title(modifications.getTitle() != null ? modifications.getTitle() : original.getTitle())
            .passage(modifications.getPassage() != null ? modifications.getPassage() : original.getPassage())
            .mediaId(modifications.getMediaId() != null ? modifications.getMediaId() : original.getMediaId())
            .order(modifications.getOrder() != null ? modifications.getOrder() : original.getOrder())
            .metadata(modifications.getMetadata() != null ? modifications.getMetadata().toString() : original.getMetadata())
            .build();

        QuestionGroup saved = questionGroupRepository.save(clone);

        // Clone questions
        List<Long> questionIds = modifications.getQuestions();
        if (questionIds == null || questionIds.isEmpty()) {
            questionIds = questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(id).stream()
                .map(QuestionGroupQuestion::getQuestionId)
                .collect(Collectors.toList());
        }
        if (!questionIds.isEmpty()) {
            addQuestionsToGroupInternal(saved.getId(), questionIds);
        }

        log.info("Cloned question group {} to new version {}", id, saved.getId());
        return getQuestionGroupById(saved.getId());
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
        for (Long questionId : questionIds) {
            if (!questionRepository.existsById(questionId)) {
                throw new RuntimeException("Question not found: " + questionId);
            }
        }
    }

    private Specification<QuestionGroup> buildSpecification(QueryQuestionGroupDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getType() != null) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            if (queryDto.getHasMedia() != null) {
                if (queryDto.getHasMedia()) {
                    predicates.add(cb.isNotNull(root.get("mediaId")));
                } else {
                    predicates.add(cb.isNull(root.get("mediaId")));
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
                Predicate titlePred = cb.like(cb.lower(root.get("title")), keyword);
                Predicate passagePred = cb.like(cb.lower(root.get("passage")), keyword);
                predicates.add(cb.or(titlePred, passagePred));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private QuestionGroupResponseDTO mapToResponseDTO(QuestionGroup group) {
        List<QuestionGroupQuestion> qgqs = questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(group.getId());

        List<QuestionGroupResponseDTO.QuestionDTO> questionDTOs = qgqs.stream()
            .map(qgq -> {
                Question q = qgq.getQuestion();
                if (q == null) return null;
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
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return QuestionGroupResponseDTO.builder()
            .id(group.getId())
            .uuid(group.getUuid())
            .version(group.getVersion())
            .type(group.getType())
            .title(group.getTitle())
            .passage(group.getPassage())
            .mediaId(group.getMediaId())
            .order(group.getOrder())
            .createdAt(group.getCreatedAt())
            .questions(questionDTOs)
            .questionsCount(questionDTOs.size())
            .hasMedia(group.getMediaId() != null)
            .hasPassage(group.getPassage() != null && !group.getPassage().isEmpty())
            .build();
    }
}

