package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentquestiongroup.AssessmentQuestionGroupResponseDTO;
import com.torii.assessment.dto.assessmentquestiongroup.CreateAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.ModifyAssessmentGroupQuestionsDTO;
import com.torii.assessment.dto.assessmentquestiongroup.QueryAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.UpdateAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestion.AssessmentQuestionResponseDTO;
import com.torii.assessment.dto.assessmentoption.AssessmentOptionResponseDTO;
import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentQuestionGroup;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionGroupRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
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
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.torii.assessment.service.AuditLogService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentQuestionGroupService {

    private final AssessmentQuestionGroupRepository assessmentQuestionGroupRepository;
    private final AssessmentGroupQuestionRepository assessmentGroupQuestionRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentItemRepository assessmentItemRepository;
    private final S3Service s3Service;
    private final AuditLogService auditLogService;

    @Transactional
    public AssessmentQuestionGroupResponseDTO create(CreateAssessmentQuestionGroupDTO dto, MultipartFile image, MultipartFile audio, Integer updatedBy) throws IOException {
        AssessmentItem item = assessmentItemRepository.findById(dto.getItemId())
                .orElseThrow(() -> new RuntimeException("Assessment item not found: " + dto.getItemId()));

        Long sourceGroupId = dto.getAssessmentQuestionGroupId() != null ? dto.getAssessmentQuestionGroupId() : dto.getOriginalGroupId();

        String mediaUrl = dto.getMediaUrl();
        if (image != null && !image.isEmpty()) {
            mediaUrl = s3Service.uploadFile(image, "assessment-question-groups/images");
        }

        String audioUrl = dto.getAudioUrl();
        if (audio != null && !audio.isEmpty()) {
            audioUrl = s3Service.uploadFile(audio, "assessment-question-groups/audio");
        }

        AssessmentQuestionGroup group = AssessmentQuestionGroup.builder()
                .originalGroupId(sourceGroupId)
                .type(dto.getType())
                .level(dto.getLevel())
                .difficulty(dto.getDifficulty())
                .stem(dto.getStem())
                .passage(dto.getPassage())
                .explanation(dto.getExplanation())
                .mediaUrl(mediaUrl)
                .audioUrl(audioUrl)
                .build();

        AssessmentQuestionGroup saved = assessmentQuestionGroupRepository.save(group);
        List<Long> questionIds = resolveAssessmentQuestionIds(dto.getQuestionIds(), dto.getAssessmentQuestionIds());
        if (!questionIds.isEmpty()) {
            addQuestionsInternal(saved.getId(), questionIds);
        }
        int nextOrder = assessmentItemRepository.findGroupIdsByItemId(item.getId()).size();
        assessmentItemRepository.insertGroupLink(item.getId(), saved.getId(), nextOrder);
        log.info("Created assessment question group copy {}", saved.getId());

        auditLogService.logAction(null, ENTITY_ASSESSMENT_QUESTION_GROUP, saved.getId(),
                ACTION_CREATE, null, null, null, updatedBy,
                "Tạo assessment question group",
                Map.of("type", String.valueOf(saved.getType()), "itemId", dto.getItemId()));

        return getById(saved.getId());
    }

    public Map<String, Object> list(QueryAssessmentQuestionGroupDTO queryDto) {
        int page = queryDto.getPage() != null ? Math.max(queryDto.getPage(), 1) : 1;
        int limit = queryDto.getLimit() != null ? Math.min(Math.max(queryDto.getLimit(), 1), 100) : 20;

        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
                queryDto.getSortBy() != null ? queryDto.getSortBy() : "createdAt"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<AssessmentQuestionGroup> spec = buildSpec(queryDto);
        Page<AssessmentQuestionGroup> groupPage = assessmentQuestionGroupRepository.findAll(spec, pageable);

        List<AssessmentQuestionGroupResponseDTO> data = groupPage.getContent().stream()
                .map(this::mapToResponse)
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

    public AssessmentQuestionGroupResponseDTO getById(Long id) {
        AssessmentQuestionGroup group = assessmentQuestionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment question group not found: " + id));
        return mapToResponse(group);
    }

    @Transactional
    public AssessmentQuestionGroupResponseDTO update(Long id, UpdateAssessmentQuestionGroupDTO dto, MultipartFile image, MultipartFile audio, Integer updatedBy) throws IOException {
        AssessmentQuestionGroup group = assessmentQuestionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment question group not found: " + id));

        Long sourceGroupId = dto.getAssessmentQuestionGroupId() != null ? dto.getAssessmentQuestionGroupId() : dto.getOriginalGroupId();
        if (sourceGroupId != null) group.setOriginalGroupId(sourceGroupId);

        if (dto.getType() != null) group.setType(dto.getType());
        if (dto.getLevel() != null) group.setLevel(dto.getLevel());
        if (dto.getDifficulty() != null) group.setDifficulty(dto.getDifficulty());
        if (dto.getStem() != null) group.setStem(dto.getStem());
        if (dto.getPassage() != null) group.setPassage(dto.getPassage());
        if (dto.getExplanation() != null) group.setExplanation(dto.getExplanation());

        if (image != null && !image.isEmpty()) {
            group.setMediaUrl(s3Service.uploadFile(image, "assessment-question-groups/images"));
        } else if (dto.getMediaUrl() != null) {
            group.setMediaUrl(dto.getMediaUrl());
        }

        if (audio != null && !audio.isEmpty()) {
            group.setAudioUrl(s3Service.uploadFile(audio, "assessment-question-groups/audio"));
        } else if (dto.getAudioUrl() != null) {
            group.setAudioUrl(dto.getAudioUrl());
        }

        assessmentQuestionGroupRepository.save(group);

        List<Long> questionIds = resolveAssessmentQuestionIds(dto.getQuestionIds(), dto.getAssessmentQuestionIds());
        if (dto.getQuestionIds() != null || dto.getAssessmentQuestionIds() != null) {
            assessmentGroupQuestionRepository.deleteAllByGroupId(id);
            if (!questionIds.isEmpty()) {
                addQuestionsInternal(id, questionIds);
            }
        }

        log.info("Updated assessment question group copy {}", id);

        auditLogService.logAction(null, ENTITY_ASSESSMENT_QUESTION_GROUP, id,
                ACTION_UPDATE, null, null, null, updatedBy,
                "Cập nhật assessment question group", null);

        return getById(id);
    }

    @Transactional
    public void delete(Long id, Integer updatedBy) {
        if (!assessmentQuestionGroupRepository.existsById(id)) {
            throw new RuntimeException("Assessment question group not found: " + id);
        }
        assessmentGroupQuestionRepository.deleteAllByGroupId(id);
        assessmentQuestionGroupRepository.deleteById(id);

        auditLogService.logAction(null, ENTITY_ASSESSMENT_QUESTION_GROUP, id,
                ACTION_DELETE, null, null, null, updatedBy,
                "Xóa assessment question group #" + id, null);

        log.info("Deleted assessment question group copy {}", id);
    }

    @Transactional
    public AssessmentQuestionGroupResponseDTO addQuestions(Long groupId, ModifyAssessmentGroupQuestionsDTO dto, Integer updatedBy) {
        if (!assessmentQuestionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Assessment question group not found: " + groupId);
        }
        addQuestionsInternal(groupId, resolveAssessmentQuestionIds(dto.getQuestionIds(), dto.getAssessmentQuestionIds()));

        auditLogService.logAction(null, ENTITY_ASSESSMENT_QUESTION_GROUP, groupId,
                ACTION_ADD, null, null, null, updatedBy,
                "Thêm câu hỏi vào assessment question group", null);

        return getById(groupId);
    }

    @Transactional
    public AssessmentQuestionGroupResponseDTO removeQuestions(Long groupId, ModifyAssessmentGroupQuestionsDTO dto, Integer updatedBy) {
        if (!assessmentQuestionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Assessment question group not found: " + groupId);
        }
        List<Long> removeIds = resolveAssessmentQuestionIds(dto.getQuestionIds(), dto.getAssessmentQuestionIds());
        List<AssessmentGroupQuestion> links = assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(groupId)
                .stream()
                .filter(link -> !removeIds.contains(link.getQuestionId()))
                .collect(Collectors.toList());
        assessmentGroupQuestionRepository.deleteAllByGroupId(groupId);
        assessmentGroupQuestionRepository.saveAll(links);

        auditLogService.logAction(null, ENTITY_ASSESSMENT_QUESTION_GROUP, groupId,
                ACTION_REMOVE, null, null, null, updatedBy,
                "Xóa câu hỏi khỏi assessment question group", null);

        return getById(groupId);
    }

    private List<Long> resolveAssessmentQuestionIds(List<Long> questionIds, List<Long> assessmentQuestionIds) {
        LinkedHashSet<Long> merged = new LinkedHashSet<>();
        if (questionIds != null) merged.addAll(questionIds);
        if (assessmentQuestionIds != null) merged.addAll(assessmentQuestionIds);
        return new ArrayList<>(merged);
    }

    private void addQuestionsInternal(Long groupId, List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return;
        }
        List<AssessmentQuestion> questions = assessmentQuestionRepository.findAllById(questionIds);
        if (questions.size() != questionIds.size()) {
            throw new RuntimeException("Some assessment questions not found");
        }
        List<AssessmentGroupQuestion> links = new ArrayList<>();
        for (int i = 0; i < questionIds.size(); i++) {
            links.add(AssessmentGroupQuestion.builder()
                    .groupId(groupId)
                    .questionId(questionIds.get(i))
                    .order(i)
                    .build());
        }
        assessmentGroupQuestionRepository.saveAll(links);
    }

    private Specification<AssessmentQuestionGroup> buildSpec(QueryAssessmentQuestionGroupDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (queryDto.getItemId() != null) {
                List<Long> groupIds = assessmentItemRepository.findGroupIdsByItemId(queryDto.getItemId());
                if (groupIds.isEmpty()) {
                    return cb.disjunction();
                }
                predicates.add(root.get("id").in(groupIds));
            }
            if (queryDto.getType() != null) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AssessmentQuestionGroupResponseDTO mapToResponse(AssessmentQuestionGroup group) {
        List<AssessmentGroupQuestion> links = assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(group.getId());
        List<Long> questionIds = links.stream()
                .map(AssessmentGroupQuestion::getQuestionId)
                .collect(Collectors.toList());

        List<AssessmentQuestionResponseDTO> questions = assessmentQuestionRepository.findAllById(questionIds).stream()
                .map(q -> {
                    List<AssessmentOptionResponseDTO> options = assessmentOptionRepository
                            .findByQuestionIdOrderByOrderAsc(q.getId()).stream()
                            .map(opt -> AssessmentOptionResponseDTO.builder()
                                    .id(opt.getId())
                                    .questionId(opt.getQuestionId())
                                    .content(opt.getContent())
                                    .isCorrect(opt.getIsCorrect())
                                    .order(opt.getOrder())
                                    .createdAt(opt.getCreatedAt())
                                    .build())
                            .collect(Collectors.toList());
                    return AssessmentQuestionResponseDTO.builder()
                            .id(q.getId())
                            .originalQuestionId(q.getOriginalQuestionId())
                            .type(q.getType())
                            .level(q.getLevel())
                            .difficulty(q.getDifficulty())
                            .stem(q.getStem())
                            .passage(q.getPassage())
                            .explanation(q.getExplanation())
                            .mediaUrl(q.getMediaUrl())
                            .audioUrl(q.getAudioUrl())
                            .createdAt(q.getCreatedAt())
                            .options(options)
                            .build();
                })
                .collect(Collectors.toList());

        return AssessmentQuestionGroupResponseDTO.builder()
                .id(group.getId())
                .assessmentQuestionGroupId(group.getOriginalGroupId())
                .originalGroupId(group.getOriginalGroupId())
                .type(group.getType())
                .level(group.getLevel() != null ? group.getLevel().name() : null)
                .difficulty(group.getDifficulty() != null ? group.getDifficulty().name() : null)
                .stem(group.getStem())
                .passage(group.getPassage())
                .explanation(group.getExplanation())
                .mediaUrl(group.getMediaUrl())
                .audioUrl(group.getAudioUrl())
                .createdAt(group.getCreatedAt())
                .questionIds(questionIds)
                .assessmentQuestionIds(questionIds)
                .questions(questions)
                .build();
    }
}
