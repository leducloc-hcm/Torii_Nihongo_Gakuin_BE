package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentquestiongroup.AssessmentQuestionGroupResponseDTO;
import com.torii.assessment.dto.assessmentquestiongroup.CreateAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.ModifyAssessmentGroupQuestionsDTO;
import com.torii.assessment.dto.assessmentquestiongroup.QueryAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.UpdateAssessmentQuestionGroupDTO;
import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentQuestionGroup;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentQuestionGroupService {

    private final AssessmentQuestionGroupRepository assessmentQuestionGroupRepository;
    private final AssessmentGroupQuestionRepository assessmentGroupQuestionRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentItemRepository assessmentItemRepository;

    @Transactional
    public AssessmentQuestionGroupResponseDTO create(CreateAssessmentQuestionGroupDTO dto) {
        AssessmentItem item = assessmentItemRepository.findById(dto.getItemId())
                .orElseThrow(() -> new RuntimeException("Assessment item not found: " + dto.getItemId()));

        Long sourceGroupId = dto.getAssessmentQuestionGroupId() != null ? dto.getAssessmentQuestionGroupId() : dto.getOriginalGroupId();

        AssessmentQuestionGroup group = AssessmentQuestionGroup.builder()
                .assessmentId(null)
            .originalGroupId(sourceGroupId)
                .type(dto.getType())
                .title(dto.getTitle())
                .passage(dto.getPassage())
                .mediaUrl(dto.getMediaUrl())
                .audioUrl(dto.getAudioUrl())
                .metadata(dto.getMetadata())
                .build();

        AssessmentQuestionGroup saved = assessmentQuestionGroupRepository.save(group);
        if (dto.getQuestionIds() != null && !dto.getQuestionIds().isEmpty()) {
            addQuestionsInternal(saved.getId(), dto.getQuestionIds());
        }
        int nextOrder = assessmentItemRepository.findGroupIdsByItemId(item.getId()).size();
        assessmentItemRepository.insertGroupLink(item.getId(), saved.getId(), nextOrder);
        log.info("Created assessment question group copy {}", saved.getId());
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
    public AssessmentQuestionGroupResponseDTO update(Long id, UpdateAssessmentQuestionGroupDTO dto) {
        AssessmentQuestionGroup group = assessmentQuestionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment question group not found: " + id));

        Long sourceGroupId = dto.getAssessmentQuestionGroupId() != null ? dto.getAssessmentQuestionGroupId() : dto.getOriginalGroupId();
        if (sourceGroupId != null) group.setOriginalGroupId(sourceGroupId);

        if (dto.getType() != null) group.setType(dto.getType());
        if (dto.getTitle() != null) group.setTitle(dto.getTitle());
        if (dto.getPassage() != null) group.setPassage(dto.getPassage());
        if (dto.getMediaUrl() != null) group.setMediaUrl(dto.getMediaUrl());
        if (dto.getAudioUrl() != null) group.setAudioUrl(dto.getAudioUrl());
        if (dto.getMetadata() != null) group.setMetadata(dto.getMetadata());
        assessmentQuestionGroupRepository.save(group);

        if (dto.getQuestionIds() != null) {
            assessmentGroupQuestionRepository.deleteAllByGroupId(id);
            if (!dto.getQuestionIds().isEmpty()) {
                addQuestionsInternal(id, dto.getQuestionIds());
            }
        }

        log.info("Updated assessment question group copy {}", id);
        return getById(id);
    }

    @Transactional
    public void delete(Long id) {
        if (!assessmentQuestionGroupRepository.existsById(id)) {
            throw new RuntimeException("Assessment question group not found: " + id);
        }
        assessmentGroupQuestionRepository.deleteAllByGroupId(id);
        assessmentQuestionGroupRepository.deleteById(id);
        log.info("Deleted assessment question group copy {}", id);
    }

    @Transactional
    public AssessmentQuestionGroupResponseDTO addQuestions(Long groupId, ModifyAssessmentGroupQuestionsDTO dto) {
        if (!assessmentQuestionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Assessment question group not found: " + groupId);
        }
        addQuestionsInternal(groupId, dto.getQuestionIds());
        return getById(groupId);
    }

    @Transactional
    public AssessmentQuestionGroupResponseDTO removeQuestions(Long groupId, ModifyAssessmentGroupQuestionsDTO dto) {
        if (!assessmentQuestionGroupRepository.existsById(groupId)) {
            throw new RuntimeException("Assessment question group not found: " + groupId);
        }
        List<AssessmentGroupQuestion> links = assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(groupId)
                .stream()
                .filter(link -> !dto.getQuestionIds().contains(link.getQuestionId()))
                .collect(Collectors.toList());
        assessmentGroupQuestionRepository.deleteAllByGroupId(groupId);
        assessmentGroupQuestionRepository.saveAll(links);
        return getById(groupId);
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
        List<Long> questionIds = assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(group.getId()).stream()
                .map(AssessmentGroupQuestion::getQuestionId)
                .collect(Collectors.toList());

        return AssessmentQuestionGroupResponseDTO.builder()
                .id(group.getId())
                .assessmentQuestionGroupId(group.getOriginalGroupId())
                .originalGroupId(group.getOriginalGroupId())
                .type(group.getType())
                .title(group.getTitle())
                .passage(group.getPassage())
                .mediaUrl(group.getMediaUrl())
                .audioUrl(group.getAudioUrl())
                .metadata(group.getMetadata())
                .createdAt(group.getCreatedAt())
                .questionIds(questionIds)
                .build();
    }
}
