package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentitem.AssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.AssessmentItemListResponseDTO;
import com.torii.assessment.dto.assessmentitem.CreateAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.ImportAssessmentItemQuestionGroupsDTO;
import com.torii.assessment.dto.assessmentitem.ImportAssessmentItemQuestionsDTO;
import com.torii.assessment.dto.assessmentitem.QueryAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.UpdateAssessmentItemDTO;
import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentOption;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentQuestionGroup;
import com.torii.assessment.entity.Option;
import com.torii.assessment.entity.Question;
import com.torii.assessment.entity.QuestionGroupQuestion;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionGroupRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentSectionRepository;
import com.torii.assessment.repository.OptionRepository;
import com.torii.assessment.repository.QuestionGroupQuestionRepository;
import com.torii.assessment.repository.QuestionGroupRepository;
import com.torii.assessment.repository.QuestionRepository;
import com.torii.assessment.entity.AssessmentSection;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.torii.assessment.service.AuditLogService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentItemService {

    private static final List<String> ALLOWED_SORT_FIELDS = List.of("id", "order", "name", "createdAt", "updatedAt");

    private final AssessmentItemRepository assessmentItemRepository;
    private final AssessmentSectionRepository assessmentSectionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final OptionRepository optionRepository;
    private final QuestionGroupQuestionRepository questionGroupQuestionRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentQuestionGroupRepository assessmentQuestionGroupRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentGroupQuestionRepository assessmentGroupQuestionRepository;
    private final AuditLogService auditLogService;

    private Long resolveAssessmentId(Long sectionId) {
        return assessmentSectionRepository.findById(sectionId)
                .map(AssessmentSection::getAssessmentId).orElse(null);
    }

    @Transactional
    public AssessmentItemDTO createAssessmentItem(CreateAssessmentItemDTO dto, Integer updatedBy) {
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

        Long assessmentId = resolveAssessmentId(dto.getSectionId());
        auditLogService.logAction(assessmentId, ENTITY_ITEM, saved.getId(),
                ACTION_CREATE, null, null, null, updatedBy,
                "Tạo item: " + saved.getName(),
                Map.of("name", saved.getName(), "sectionId", dto.getSectionId()));

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
    public AssessmentItemDTO updateAssessmentItem(Long id, UpdateAssessmentItemDTO dto, Integer updatedBy) {
        AssessmentItem item = assessmentItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment item with ID " + id + " not found"));

        Long assessmentId = resolveAssessmentId(item.getSectionId());

        validateQuestionIds(dto.getQuestionIds());
        validateQuestionGroupIds(dto.getQuestionGroupIds());

        String oldName = item.getName();
        Integer oldOrder = item.getOrder();

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

        auditLogService.logFieldChange(assessmentId, ENTITY_ITEM, id, "name", oldName, item.getName(), updatedBy);
        auditLogService.logFieldChange(assessmentId, ENTITY_ITEM, id, "order",
                oldOrder != null ? oldOrder.toString() : null,
                item.getOrder() != null ? item.getOrder().toString() : null, updatedBy);

        log.info("Updated assessment item: {}", id);
        return getAssessmentItem(id);
    }

    @Transactional
    public void deleteAssessmentItem(Long id, Integer updatedBy) {
        AssessmentItem item = assessmentItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment item with ID " + id + " not found"));

        Long assessmentId = resolveAssessmentId(item.getSectionId());

        assessmentItemRepository.deleteQuestionLinksByItemId(id);
        assessmentItemRepository.deleteGroupLinksByItemId(id);
        assessmentItemRepository.deleteById(id);

        auditLogService.logAction(assessmentId, ENTITY_ITEM, id,
                ACTION_DELETE, null, null, null, updatedBy,
                "Xóa item: " + item.getName(),
                Map.of("name", item.getName(), "sectionId", item.getSectionId()));

        log.info("Deleted assessment item: {}", id);
    }

    @Transactional
    public Map<String, Object> importQuestionsToAssessmentItem(Long itemId, ImportAssessmentItemQuestionsDTO dto, Integer updatedBy) {
        ensureItemExists(itemId);

        List<Long> sourceQuestionIds = dto.getQuestionIds();
        List<Question> questions = questionRepository.findAllById(sourceQuestionIds);
        if (questions.size() != sourceQuestionIds.size()) {
            throw new RuntimeException("Some questions not found");
        }

        Map<Long, Question> questionMap = questions.stream()
                .collect(Collectors.toMap(Question::getId, Function.identity()));

        int nextOrder = assessmentItemRepository.findQuestionIdsByItemId(itemId).size();
        List<Long> importedIds = new ArrayList<>();
        for (Long sourceQuestionId : sourceQuestionIds) {
            Question sourceQuestion = questionMap.get(sourceQuestionId);
            AssessmentQuestion copied = cloneAssessmentQuestion(sourceQuestion);
            assessmentItemRepository.insertQuestionLink(itemId, copied.getId(), nextOrder++);
            importedIds.add(copied.getId());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("itemId", itemId);
        response.put("importedCount", importedIds.size());
        response.put("assessmentQuestionIds", importedIds);
        response.put("message", "Questions imported successfully");

        AssessmentItem item = assessmentItemRepository.findById(itemId).orElse(null);
        Long assessmentId = item != null ? resolveAssessmentId(item.getSectionId()) : null;
        auditLogService.logAction(assessmentId, ENTITY_ITEM, itemId,
                ACTION_IMPORT, null, null, null, updatedBy,
                "Import " + importedIds.size() + " câu hỏi vào item",
                Map.of("importedQuestionIds", importedIds));

        return response;
    }

    @Transactional
    public Map<String, Object> importQuestionGroupsToAssessmentItem(Long itemId, ImportAssessmentItemQuestionGroupsDTO dto, Integer updatedBy) {
        ensureItemExists(itemId);

        List<Long> sourceGroupIds = dto.getQuestionGroupIds();
        List<QuestionGroup> groups = questionGroupRepository.findAllById(sourceGroupIds);
        if (groups.size() != sourceGroupIds.size()) {
            throw new RuntimeException("Some question groups not found");
        }

        Map<Long, QuestionGroup> groupMap = groups.stream()
                .collect(Collectors.toMap(QuestionGroup::getId, Function.identity()));

        int nextGroupOrder = assessmentItemRepository.findGroupIdsByItemId(itemId).size();
        List<Long> importedGroupIds = new ArrayList<>();

        for (Long sourceGroupId : sourceGroupIds) {
            QuestionGroup sourceGroup = groupMap.get(sourceGroupId);

            AssessmentQuestionGroup copiedGroup = AssessmentQuestionGroup.builder()
                    .originalGroupId(sourceGroup.getId())
                    .type(sourceGroup.getType())
                    .level(sourceGroup.getLevel())
                    .difficulty(sourceGroup.getDifficulty())
                    .stem(sourceGroup.getStem())
                    .passage(sourceGroup.getPassage())
                    .explanation(sourceGroup.getExplanation())
                    .mediaUrl(sourceGroup.getMediaUrl())
                    .audioUrl(sourceGroup.getAudioUrl())
                    .build();
            copiedGroup = assessmentQuestionGroupRepository.save(copiedGroup);

            List<QuestionGroupQuestion> sourceLinks = questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(sourceGroupId);
            List<AssessmentGroupQuestion> copiedLinks = new ArrayList<>();
            Map<Long, Long> clonedQuestionMap = new HashMap<>();

            for (int i = 0; i < sourceLinks.size(); i++) {
                QuestionGroupQuestion sourceLink = sourceLinks.get(i);
                Long sourceQuestionId = sourceLink.getQuestionId();

                Long copiedQuestionId = clonedQuestionMap.get(sourceQuestionId);
                if (copiedQuestionId == null) {
                    Question sourceQuestion = questionRepository.findById(sourceQuestionId)
                            .orElseThrow(() -> new RuntimeException("Question not found: " + sourceQuestionId));
                    copiedQuestionId = cloneAssessmentQuestion(sourceQuestion).getId();
                    clonedQuestionMap.put(sourceQuestionId, copiedQuestionId);
                }

                copiedLinks.add(AssessmentGroupQuestion.builder()
                        .groupId(copiedGroup.getId())
                        .questionId(copiedQuestionId)
                        .order(sourceLink.getOrder() != null ? sourceLink.getOrder() : i)
                        .build());
            }

            if (!copiedLinks.isEmpty()) {
                assessmentGroupQuestionRepository.saveAll(copiedLinks);
            }

            assessmentItemRepository.insertGroupLink(itemId, copiedGroup.getId(), nextGroupOrder++);
            importedGroupIds.add(copiedGroup.getId());
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("itemId", itemId);
        response.put("importedCount", importedGroupIds.size());
        response.put("assessmentQuestionGroupIds", importedGroupIds);
        response.put("message", "Question groups imported successfully");

        AssessmentItem item = assessmentItemRepository.findById(itemId).orElse(null);
        Long assessmentId = item != null ? resolveAssessmentId(item.getSectionId()) : null;
        auditLogService.logAction(assessmentId, ENTITY_ITEM, itemId,
                ACTION_IMPORT, null, null, null, updatedBy,
                "Import " + importedGroupIds.size() + " nhóm câu hỏi vào item",
                Map.of("importedGroupIds", importedGroupIds));

        return response;
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

    private void ensureItemExists(Long itemId) {
        if (!assessmentItemRepository.existsById(itemId)) {
            throw new RuntimeException("Assessment item with ID " + itemId + " not found");
        }
    }

    private AssessmentQuestion cloneAssessmentQuestion(Question sourceQuestion) {
        AssessmentQuestion copied = AssessmentQuestion.builder()
                .originalQuestionId(sourceQuestion.getId())
                .type(sourceQuestion.getType())
                .level(sourceQuestion.getLevel())
                .difficulty(sourceQuestion.getDifficulty())
                .stem(sourceQuestion.getStem())
                .passage(sourceQuestion.getPassage())
                .explanation(sourceQuestion.getExplanation())
                .mediaUrl(sourceQuestion.getMediaUrl())
                .audioUrl(null)
                .build();

        copied = assessmentQuestionRepository.save(copied);

        List<Option> sourceOptions = optionRepository.findByQuestionIdOrderByOrderAsc(sourceQuestion.getId());
        if (!sourceOptions.isEmpty()) {
            List<AssessmentOption> copiedOptions = new ArrayList<>();
            for (int i = 0; i < sourceOptions.size(); i++) {
                Option sourceOption = sourceOptions.get(i);
                copiedOptions.add(AssessmentOption.builder()
                        .questionId(copied.getId())
                        .content(sourceOption.getContent())
                        .isCorrect(sourceOption.getIsCorrect() != null ? sourceOption.getIsCorrect() : false)
                        .order(sourceOption.getOrder() != null ? sourceOption.getOrder() : i)
                        .build());
            }
            assessmentOptionRepository.saveAll(copiedOptions);
        }

        return copied;
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
