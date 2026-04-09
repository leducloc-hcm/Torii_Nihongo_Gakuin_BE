package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentitem.AssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.AssessmentItemListResponseDTO;
import com.torii.assessment.dto.assessmentitem.CreateAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.QueryAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.UpdateAssessmentItemDTO;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.Question;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentSectionRepository;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentItemService {

    private static final List<String> ALLOWED_SORT_FIELDS = List.of("id", "order", "name", "createdAt", "updatedAt");

    private final AssessmentItemRepository assessmentItemRepository;
    private final AssessmentSectionRepository assessmentSectionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionGroupRepository questionGroupRepository;

    @Transactional
    public AssessmentItemDTO createAssessmentItem(CreateAssessmentItemDTO dto) {
        if (!assessmentSectionRepository.existsById(dto.getSectionId())) {
            throw new RuntimeException("Assessment section with ID " + dto.getSectionId() + " not found");
        }

        validateQuestionIds(dto.getQuestionIds());
        validateQuestionGroupIds(dto.getQuestionGroupIds());

        AssessmentItem item = new AssessmentItem();
        item.setSectionId(dto.getSectionId());
        item.setName(dto.getName());
        item.setOrder(dto.getOrder() != null ? dto.getOrder() : 0);
        item.setScorePerQuestion(dto.getScorePerQuestion());

        AssessmentItem saved = assessmentItemRepository.save(item);

        upsertQuestionLinks(saved.getId(), dto.getQuestionIds(), false);
        upsertGroupLinks(saved.getId(), dto.getQuestionGroupIds(), false);

        log.info("Created assessment item: {}", saved.getId());
        return getAssessmentItem(saved.getId());
    }

    public AssessmentItemDTO getAssessmentItem(Long id) {
        AssessmentItem item = assessmentItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment item with ID " + id + " not found"));

        return mapToDTO(item);
    }

    public AssessmentItemListResponseDTO getAssessmentItems(QueryAssessmentItemDTO queryDto) {
        int page = queryDto.getPage() != null ? Math.max(queryDto.getPage(), 1) : 1;
        int limit = queryDto.getLimit() != null ? Math.max(Math.min(queryDto.getLimit(), 100), 1) : 20;

        String sortBy = normalizeSortBy(queryDto.getSortBy());
        String sortOrder = queryDto.getSortOrder() != null ? queryDto.getSortOrder() : "asc";

        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(sortOrder) ? Sort.Direction.DESC : Sort.Direction.ASC,
                sortBy
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<AssessmentItem> spec = buildSpecification(queryDto);
        Page<AssessmentItem> itemPage = assessmentItemRepository.findAll(spec, pageable);

        List<AssessmentItemDTO> data = itemPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        AssessmentItemListResponseDTO.PaginationDTO pagination = new AssessmentItemListResponseDTO.PaginationDTO(
                itemPage.getTotalElements(),
                page,
                limit,
                itemPage.getTotalPages(),
                itemPage.hasNext(),
                itemPage.hasPrevious()
        );

        return new AssessmentItemListResponseDTO(data, pagination);
    }

    @Transactional
    public AssessmentItemDTO updateAssessmentItem(Long id, UpdateAssessmentItemDTO dto) {
        AssessmentItem item = assessmentItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment item with ID " + id + " not found"));

        validateQuestionIds(dto.getQuestionIds());
        validateQuestionGroupIds(dto.getQuestionGroupIds());

        if (dto.getName() != null) {
            item.setName(dto.getName());
        }
        if (dto.getOrder() != null) {
            item.setOrder(dto.getOrder());
        }
        if (dto.getScorePerQuestion() != null) {
            item.setScorePerQuestion(dto.getScorePerQuestion());
        }

        assessmentItemRepository.save(item);

        upsertQuestionLinks(id, dto.getQuestionIds(), true);
        upsertGroupLinks(id, dto.getQuestionGroupIds(), true);

        log.info("Updated assessment item: {}", id);
        return getAssessmentItem(id);
    }

    @Transactional
    public void deleteAssessmentItem(Long id) {
        if (!assessmentItemRepository.existsById(id)) {
            throw new RuntimeException("Assessment item with ID " + id + " not found");
        }

        assessmentItemRepository.deleteQuestionLinksByItemId(id);
        assessmentItemRepository.deleteGroupLinksByItemId(id);
        assessmentItemRepository.deleteById(id);

        log.info("Deleted assessment item: {}", id);
    }

    private void validateQuestionIds(List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return;
        }

        List<Question> questions = questionRepository.findAllById(questionIds);
        if (questions.size() != questionIds.size()) {
            throw new RuntimeException("Some questions not found");
        }
    }

    private void validateQuestionGroupIds(List<Long> questionGroupIds) {
        if (questionGroupIds == null || questionGroupIds.isEmpty()) {
            return;
        }

        List<QuestionGroup> groups = questionGroupRepository.findAllById(questionGroupIds);
        if (groups.size() != questionGroupIds.size()) {
            throw new RuntimeException("Some question groups not found");
        }
    }

    private void upsertQuestionLinks(Long itemId, List<Long> questionIds, boolean clearExisting) {
        if (clearExisting) {
            assessmentItemRepository.deleteQuestionLinksByItemId(itemId);
        }
        if (questionIds == null || questionIds.isEmpty()) {
            return;
        }

        for (int i = 0; i < questionIds.size(); i++) {
            assessmentItemRepository.insertQuestionLink(itemId, questionIds.get(i), i);
        }
    }

    private void upsertGroupLinks(Long itemId, List<Long> groupIds, boolean clearExisting) {
        if (clearExisting) {
            assessmentItemRepository.deleteGroupLinksByItemId(itemId);
        }
        if (groupIds == null || groupIds.isEmpty()) {
            return;
        }

        for (int i = 0; i < groupIds.size(); i++) {
            assessmentItemRepository.insertGroupLink(itemId, groupIds.get(i), i);
        }
    }

    private Specification<AssessmentItem> buildSpecification(QueryAssessmentItemDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getSectionId() != null) {
                predicates.add(cb.equal(root.get("sectionId"), queryDto.getSectionId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String normalizeSortBy(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "order";
        }
        if (ALLOWED_SORT_FIELDS.contains(sortBy)) {
            return sortBy;
        }
        return "order";
    }

    private AssessmentItemDTO mapToDTO(AssessmentItem item) {
        List<Long> questionIds = assessmentItemRepository.findQuestionIdsByItemId(item.getId());
        List<Long> groupIds = assessmentItemRepository.findGroupIdsByItemId(item.getId());

        List<AssessmentItemDTO.QuestionResponseDTO> questionResponses = mapQuestionResponses(questionIds);
        List<AssessmentItemDTO.QuestionGroupResponseDTO> groupResponses = mapGroupResponses(groupIds);

        return AssessmentItemDTO.builder()
                .id(item.getId())
                .sectionId(item.getSectionId())
                .name(item.getName())
                .order(item.getOrder())
                .scorePerQuestion(item.getScorePerQuestion())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .questions(questionResponses)
                .questionGroups(groupResponses)
                .build();
    }

    private List<AssessmentItemDTO.QuestionResponseDTO> mapQuestionResponses(List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, Question> questionMap = questionRepository.findAllById(questionIds).stream()
                .collect(Collectors.toMap(Question::getId, q -> q));

        List<AssessmentItemDTO.QuestionResponseDTO> responses = new ArrayList<>();
        for (Long questionId : questionIds) {
            Question question = questionMap.get(questionId);
            if (question == null) {
                continue;
            }
            responses.add(AssessmentItemDTO.QuestionResponseDTO.builder()
                    .id(question.getId())
                    .stem(question.getStem())
                    .type(question.getType() != null ? question.getType().name() : null)
                    .difficulty(question.getDifficulty() != null ? question.getDifficulty().name() : null)
                    .level(question.getLevel() != null ? question.getLevel().name() : null)
                    .build());
        }

        return responses;
    }

    private List<AssessmentItemDTO.QuestionGroupResponseDTO> mapGroupResponses(List<Long> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, QuestionGroup> groupMap = questionGroupRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(QuestionGroup::getId, g -> g, (a, b) -> a, LinkedHashMap::new));

        List<AssessmentItemDTO.QuestionGroupResponseDTO> responses = new ArrayList<>();
        for (Long groupId : groupIds) {
            QuestionGroup group = groupMap.get(groupId);
            if (group == null) {
                continue;
            }
            responses.add(AssessmentItemDTO.QuestionGroupResponseDTO.builder()
                    .id(group.getId())
                    .title(group.getStem())
                    .type(group.getType() != null ? group.getType().name() : null)
                    .build());
        }

        return responses;
    }
}
