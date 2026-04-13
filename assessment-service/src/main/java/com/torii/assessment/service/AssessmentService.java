package com.torii.assessment.service;

import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.dto.assessment.AssessmentListResponseDTO;
import com.torii.assessment.dto.assessment.CreateAssessmentDTO;
import com.torii.assessment.dto.assessment.QueryAssessmentDTO;
import com.torii.assessment.dto.assessment.UpdateAssessmentDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentOption;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentQuestionGroup;
import com.torii.assessment.entity.AssessmentSection;
import com.torii.assessment.entity.ScoreProfile;
import com.torii.assessment.entity.ScoreProfileSection;
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionGroupRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AssessmentLogRepository;
import com.torii.assessment.entity.AssessmentLog;
import com.torii.assessment.repository.AssessmentSectionRepository;
import com.torii.assessment.repository.ItemAssessmentGroupRepository;
import com.torii.assessment.repository.ItemAssessmentQuestionRepository;
import com.torii.assessment.repository.ScoreProfileRepository;
import com.torii.assessment.repository.ScoreProfileSectionRepository;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentLogRepository assessmentLogRepository;
    private final ScoreProfileRepository scoreProfileRepository;
    private final AssessmentSectionRepository assessmentSectionRepository;
    private final AssessmentItemRepository assessmentItemRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentQuestionGroupRepository assessmentQuestionGroupRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentGroupQuestionRepository assessmentGroupQuestionRepository;
    private final ScoreProfileSectionRepository scoreProfileSectionRepository;
    private final ItemAssessmentQuestionRepository itemAssessmentQuestionRepository;
    private final ItemAssessmentGroupRepository itemAssessmentGroupRepository;

    @Transactional
    public AssessmentDTO createAssessment(CreateAssessmentDTO dto) {
        Assessment assessment = new Assessment();
        assessment.setTitle(dto.getTitle());
        assessment.setLevel(dto.getLevel() != null ? Assessment.JLPTLevel.valueOf(dto.getLevel()) : null);
        assessment.setType(Assessment.AssessmentType.valueOf(dto.getType()));
        assessment.setVisibility(dto.getVisibility() != null
            ? Assessment.AssessmentVisibility.valueOf(dto.getVisibility())
            : Assessment.AssessmentVisibility.PRIVATE);
        assessment.setCreatedBy(dto.getCreatedBy());
        assessment.setLessonId(dto.getLessonId());
        assessment.setClassId(dto.getClassId());
        assessment.setScoreProfile(resolveScoreProfile(dto.getScoreProfileId()));
        assessment.setStartAt(dto.getStartAt());
        assessment.setDueAt(dto.getDueAt());
        assessment.setLockAfterDue(dto.getLockAfterDue());
        assessment.setMaxAttempts(dto.getMaxAttempts());

        Assessment saved = assessmentRepository.save(assessment);
        autoGenerateSectionsFromScoreProfile(saved);
        log.info("Created assessment: {}", saved.getId());

        saveLog(saved.getId(), "CREATE", null, null, null, dto.getCreatedBy(), "CREATE_ASSESSMENT");

        return mapToDTO(saved);
    }

    public AssessmentListResponseDTO getAllAssessments(QueryAssessmentDTO queryDto) {
        int page = queryDto.getPage() != null ? queryDto.getPage() : 1;
        int limit = queryDto.getLimit() != null ? queryDto.getLimit() : 20;

        Sort sort = Sort.by(
            "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
            queryDto.getSortBy() != null ? queryDto.getSortBy() : "createdAt"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<Assessment> spec = buildSpecification(queryDto);
        Page<Assessment> assessmentPage = assessmentRepository.findAll(spec, pageable);

        List<AssessmentDTO> data = assessmentPage.getContent().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());

        AssessmentListResponseDTO.PaginationDTO pagination = new AssessmentListResponseDTO.PaginationDTO(
            assessmentPage.getTotalElements(),
            page,
            limit,
            assessmentPage.getTotalPages(),
            assessmentPage.hasNext(),
            assessmentPage.hasPrevious()
        );

        return new AssessmentListResponseDTO(data, pagination);
    }

    public AssessmentDTO getAssessmentById(Long id) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + id));
        return mapToDetailedDTO(assessment);
    }

    @Transactional
    public AssessmentDTO cloneAssessment(Long sourceAssessmentId, Integer createdBy) {
        Assessment source = assessmentRepository.findById(sourceAssessmentId)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + sourceAssessmentId));

        Assessment cloned = new Assessment();
        cloned.setTitle(source.getTitle() + " (Clone)");
        cloned.setType(source.getType());
        cloned.setLevel(source.getLevel());
        cloned.setVisibility(source.getVisibility());
        cloned.setCreatedBy(createdBy);
        cloned.setLessonId(source.getLessonId());
        cloned.setClassId(source.getClassId());
        cloned.setScoreProfile(source.getScoreProfile());
        cloned.setStartAt(source.getStartAt());
        cloned.setDueAt(source.getDueAt());
        cloned.setLockAfterDue(source.getLockAfterDue());
        cloned.setMaxAttempts(source.getMaxAttempts());

        Assessment savedClone = assessmentRepository.save(cloned);

        Map<Long, Long> questionIdMap = new HashMap<>();
        Map<Long, Long> groupIdMap = new HashMap<>();

        List<AssessmentSection> sourceSections = assessmentSectionRepository.findByAssessmentId(sourceAssessmentId);
        sourceSections.sort(Comparator.comparing(AssessmentSection::getOrder, Comparator.nullsLast(Integer::compareTo)));

        for (AssessmentSection sourceSection : sourceSections) {
            AssessmentSection clonedSection = new AssessmentSection();
            clonedSection.setAssessmentId(savedClone.getId());
            clonedSection.setTitle(sourceSection.getTitle());
            clonedSection.setTimeLimitSec(sourceSection.getTimeLimitSec());
            clonedSection.setType(sourceSection.getType());
            clonedSection.setOrder(sourceSection.getOrder());
            AssessmentSection savedSection = assessmentSectionRepository.save(clonedSection);

            List<AssessmentItem> sourceItems = assessmentItemRepository.findBySectionIdOrderByOrderAsc(sourceSection.getId());
            for (AssessmentItem sourceItem : sourceItems) {
                AssessmentItem clonedItem = new AssessmentItem();
                clonedItem.setSectionId(savedSection.getId());
                clonedItem.setName(sourceItem.getName());
                clonedItem.setScorePerQuestion(sourceItem.getScorePerQuestion());
                clonedItem.setOrder(sourceItem.getOrder());
                AssessmentItem savedItem = assessmentItemRepository.save(clonedItem);

                List<com.torii.assessment.entity.ItemAssessmentQuestion> questionLinks =
                    itemAssessmentQuestionRepository.findByItemIdOrderByOrderAsc(sourceItem.getId());
                for (com.torii.assessment.entity.ItemAssessmentQuestion questionLink : questionLinks) {
                    Long clonedQuestionId = questionIdMap.computeIfAbsent(
                        questionLink.getQuestionId(),
                        this::cloneQuestionWithOptions
                    );

                    itemAssessmentQuestionRepository.save(
                        com.torii.assessment.entity.ItemAssessmentQuestion.builder()
                            .itemId(savedItem.getId())
                            .questionId(clonedQuestionId)
                            .order(questionLink.getOrder())
                            .score(questionLink.getScore())
                            .build()
                    );
                }

                List<com.torii.assessment.entity.ItemAssessmentGroup> groupLinks =
                    itemAssessmentGroupRepository.findByItemIdOrderByOrderAsc(sourceItem.getId());
                for (com.torii.assessment.entity.ItemAssessmentGroup groupLink : groupLinks) {
                    Long clonedGroupId = groupIdMap.computeIfAbsent(
                        groupLink.getGroupId(),
                        groupId -> cloneQuestionGroupWithQuestions(groupId, questionIdMap)
                    );

                    itemAssessmentGroupRepository.save(
                        com.torii.assessment.entity.ItemAssessmentGroup.builder()
                            .itemId(savedItem.getId())
                            .groupId(clonedGroupId)
                            .order(groupLink.getOrder())
                            .score(groupLink.getScore())
                            .build()
                    );
                }
            }
        }

        saveLog(savedClone.getId(), "CLONE", "sourceAssessmentId", sourceAssessmentId, savedClone.getId(), createdBy, "CLONE_ASSESSMENT");
        log.info("Cloned assessment {} -> {}", sourceAssessmentId, savedClone.getId());

        return mapToDetailedDTO(savedClone);
    }

    @Transactional
    public AssessmentDTO updateAssessment(Long id, UpdateAssessmentDTO dto) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + id));

        if (dto.getTitle() != null) {
            saveLog(id, "UPDATE", "title", assessment.getTitle(), dto.getTitle(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setTitle(dto.getTitle());
        }
        if (dto.getLevel() != null) {
            saveLog(id, "UPDATE", "level", assessment.getLevel(), dto.getLevel(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setLevel(Assessment.JLPTLevel.valueOf(dto.getLevel()));
        }
        if (dto.getType() != null) {
            saveLog(id, "UPDATE", "type", assessment.getType(), dto.getType(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setType(Assessment.AssessmentType.valueOf(dto.getType()));
        }
        if (dto.getVisibility() != null) {
            saveLog(id, "UPDATE", "visibility", assessment.getVisibility(), dto.getVisibility(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setVisibility(Assessment.AssessmentVisibility.valueOf(dto.getVisibility()));
        }
        if (dto.getLessonId() != null) {
            saveLog(id, "UPDATE", "lessonId", assessment.getLessonId(), dto.getLessonId(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setLessonId(dto.getLessonId());
        }
        if (dto.getClassId() != null) {
            saveLog(id, "UPDATE", "classId", assessment.getClassId(), dto.getClassId(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setClassId(dto.getClassId());
        }
        if (dto.getScoreProfileId() != null) {
            Long oldProfileId = assessment.getScoreProfile() != null ? assessment.getScoreProfile().getId() : null;
            saveLog(id, "UPDATE", "scoreProfileId", oldProfileId, dto.getScoreProfileId(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setScoreProfile(resolveScoreProfile(dto.getScoreProfileId()));
        }
        if (dto.getStartAt() != null) {
            saveLog(id, "UPDATE", "startAt", assessment.getStartAt(), dto.getStartAt(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setStartAt(dto.getStartAt());
        }
        if (dto.getDueAt() != null) {
            saveLog(id, "UPDATE", "dueAt", assessment.getDueAt(), dto.getDueAt(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setDueAt(dto.getDueAt());
        }
        if (dto.getLockAfterDue() != null) {
            saveLog(id, "UPDATE", "lockAfterDue", assessment.getLockAfterDue(), dto.getLockAfterDue(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setLockAfterDue(dto.getLockAfterDue());
        }
        if (dto.getMaxAttempts() != null) {
            saveLog(id, "UPDATE", "maxAttempts", assessment.getMaxAttempts(), dto.getMaxAttempts(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setMaxAttempts(dto.getMaxAttempts());
        }

        Assessment updated = assessmentRepository.save(assessment);
        log.info("Updated assessment: {}", updated.getId());

        return mapToDTO(updated);
    }

    @Transactional
    public void deleteAssessment(Long id, Integer updatedBy) {
        if (!assessmentRepository.existsById(id)) {
            throw new RuntimeException("Assessment not found: " + id);
        }
        assessmentRepository.deleteById(id);
        log.info("Deleted assessment: {}", id);

        saveLog(id, "DELETE", null, null, null, updatedBy, "DELETE_ASSESSMENT");
    }

    private Specification<Assessment> buildSpecification(QueryAssessmentDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getLevel() != null && !queryDto.getLevel().isBlank()) {
                predicates.add(cb.equal(root.get("level"), Assessment.JLPTLevel.valueOf(queryDto.getLevel())));
            }
            if (queryDto.getType() != null && !queryDto.getType().isBlank()) {
                predicates.add(cb.equal(root.get("type"), Assessment.AssessmentType.valueOf(queryDto.getType())));
            }
            if (queryDto.getVisibility() != null && !queryDto.getVisibility().isBlank()) {
                predicates.add(cb.equal(root.get("visibility"), Assessment.AssessmentVisibility.valueOf(queryDto.getVisibility())));
            }
            if (queryDto.getClassId() != null) {
                predicates.add(cb.equal(root.get("classId"), queryDto.getClassId()));
            }
            if (queryDto.getScoreProfileId() != null) {
                predicates.add(cb.equal(root.get("scoreProfile").get("id"), queryDto.getScoreProfileId()));
            }
            if (queryDto.getLessonId() != null) {
                predicates.add(cb.equal(root.get("lessonId"), queryDto.getLessonId()));
            }
            if (queryDto.getKeyword() != null && !queryDto.getKeyword().isBlank()) {
                String kw = "%" + queryDto.getKeyword().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("title")), kw));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AssessmentDTO mapToDTO(Assessment assessment) {
        return AssessmentDTO.builder()
            .id(assessment.getId())
            .title(assessment.getTitle())
            .level(assessment.getLevel() != null ? assessment.getLevel().name() : null)
            .type(assessment.getType() != null ? assessment.getType().name() : null)
            .visibility(assessment.getVisibility() != null ? assessment.getVisibility().name() : null)
            .createdBy(assessment.getCreatedBy())
            .lessonId(assessment.getLessonId())
            .classId(assessment.getClassId())
            .scoreProfileId(assessment.getScoreProfile() != null ? assessment.getScoreProfile().getId() : null)
            .lockAfterDue(assessment.getLockAfterDue())
            .maxAttempts(assessment.getMaxAttempts())
            .startAt(assessment.getStartAt())
            .dueAt(assessment.getDueAt())
            .createdAt(assessment.getCreatedAt())
            .updatedAt(assessment.getUpdatedAt())
            .build();
    }

    private AssessmentDTO mapToDetailedDTO(Assessment assessment) {
        AssessmentDTO base = mapToDTO(assessment);

        List<AssessmentSection> sections = assessmentSectionRepository.findByAssessmentId(assessment.getId());
        sections.sort(Comparator.comparing(AssessmentSection::getOrder, Comparator.nullsLast(Integer::compareTo)));

        List<AssessmentDTO.SectionDetailDTO> sectionDetails = sections.stream().map(section -> {
            List<AssessmentItem> items = assessmentItemRepository.findBySectionIdOrderByOrderAsc(section.getId());

            List<AssessmentDTO.ItemDetailDTO> itemDetails = items.stream().map(item -> {
                List<Long> questionIds = assessmentItemRepository.findQuestionIdsByItemId(item.getId());
                List<Long> groupIds = assessmentItemRepository.findGroupIdsByItemId(item.getId());

                Map<Long, AssessmentQuestion> questionMap = assessmentQuestionRepository.findAllById(questionIds)
                    .stream()
                    .collect(Collectors.toMap(AssessmentQuestion::getId, q -> q, (a, b) -> a, HashMap::new));

                List<AssessmentDTO.QuestionDetailDTO> questions = questionIds.stream()
                    .map(questionMap::get)
                    .filter(q -> q != null)
                    .map(q -> {
                        List<AssessmentOption> options = assessmentOptionRepository.findByQuestionIdOrderByOrderAsc(q.getId());
                        List<AssessmentDTO.OptionDetailDTO> optionDetails = options.stream()
                            .map(o -> AssessmentDTO.OptionDetailDTO.builder()
                                .id(o.getId())
                                .content(o.getContent())
                                .isCorrect(o.getIsCorrect())
                                .order(o.getOrder())
                                .build())
                            .collect(Collectors.toList());

                        return AssessmentDTO.QuestionDetailDTO.builder()
                            .id(q.getId())
                            .originalQuestionId(q.getOriginalQuestionId())
                            .type(q.getType() != null ? q.getType().name() : null)
                            .level(q.getLevel() != null ? q.getLevel().name() : null)
                            .difficulty(q.getDifficulty() != null ? q.getDifficulty().name() : null)
                            .stem(q.getStem())
                            .passage(q.getPassage())
                            .explanation(q.getExplanation())
                            .mediaUrl(q.getMediaUrl())
                            .audioUrl(q.getAudioUrl())
                            .options(optionDetails)
                            .build();
                    })
                    .collect(Collectors.toList());

                Map<Long, AssessmentQuestionGroup> groupMap = assessmentQuestionGroupRepository.findAllById(groupIds)
                    .stream()
                    .collect(Collectors.toMap(AssessmentQuestionGroup::getId, g -> g, (a, b) -> a, HashMap::new));

                List<AssessmentDTO.QuestionGroupDetailDTO> groups = groupIds.stream()
                    .map(groupMap::get)
                    .filter(g -> g != null)
                    .map(g -> {
                        List<Long> groupQuestionIds = assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(g.getId())
                            .stream()
                            .map(AssessmentGroupQuestion::getQuestionId)
                            .collect(Collectors.toList());

                        Map<Long, AssessmentQuestion> groupQuestionMap = assessmentQuestionRepository.findAllById(groupQuestionIds)
                            .stream()
                            .collect(Collectors.toMap(AssessmentQuestion::getId, q -> q, (a, b) -> a, HashMap::new));

                        List<AssessmentDTO.QuestionDetailDTO> groupQuestions = groupQuestionIds.stream()
                            .map(groupQuestionMap::get)
                            .filter(q -> q != null)
                            .map(q -> {
                                List<AssessmentOption> options = assessmentOptionRepository.findByQuestionIdOrderByOrderAsc(q.getId());
                                List<AssessmentDTO.OptionDetailDTO> optionDetails = options.stream()
                                    .map(o -> AssessmentDTO.OptionDetailDTO.builder()
                                        .id(o.getId())
                                        .content(o.getContent())
                                        .isCorrect(o.getIsCorrect())
                                        .order(o.getOrder())
                                        .build())
                                    .collect(Collectors.toList());

                                return AssessmentDTO.QuestionDetailDTO.builder()
                                    .id(q.getId())
                                    .originalQuestionId(q.getOriginalQuestionId())
                                    .type(q.getType() != null ? q.getType().name() : null)
                                    .level(q.getLevel() != null ? q.getLevel().name() : null)
                                    .difficulty(q.getDifficulty() != null ? q.getDifficulty().name() : null)
                                    .stem(q.getStem())
                                    .passage(q.getPassage())
                                    .explanation(q.getExplanation())
                                    .mediaUrl(q.getMediaUrl())
                                    .audioUrl(q.getAudioUrl())
                                    .options(optionDetails)
                                    .build();
                            })
                            .collect(Collectors.toList());

                        return AssessmentDTO.QuestionGroupDetailDTO.builder()
                            .id(g.getId())
                            .originalGroupId(g.getOriginalGroupId())
                            .type(g.getType() != null ? g.getType().name() : null)
                            .level(g.getLevel() != null ? g.getLevel().name() : null)
                            .difficulty(g.getDifficulty() != null ? g.getDifficulty().name() : null)
                            .stem(g.getStem())
                            .passage(g.getPassage())
                            .explanation(g.getExplanation())
                            .mediaUrl(g.getMediaUrl())
                            .audioUrl(g.getAudioUrl())
                            .questionIds(groupQuestionIds)
                                .questions(groupQuestions)
                            .build();
                    })
                    .collect(Collectors.toList());

                return AssessmentDTO.ItemDetailDTO.builder()
                    .id(item.getId())
                    .name(item.getName())
                    .order(item.getOrder())
                    .scorePerQuestion(item.getScorePerQuestion())
                    .questions(questions)
                    .questionGroups(groups)
                    .build();
            }).collect(Collectors.toList());

            return AssessmentDTO.SectionDetailDTO.builder()
                .id(section.getId())
                .title(section.getTitle())
                .type(section.getType() != null ? section.getType().name() : null)
                .order(section.getOrder())
                .timeLimitSec(section.getTimeLimitSec())
                .items(itemDetails)
                .build();
        }).collect(Collectors.toList());

        base.setSections(sectionDetails);
        return base;
    }

    private ScoreProfile resolveScoreProfile(Long scoreProfileId) {
        if (scoreProfileId == null) {
            throw new RuntimeException("scoreProfileId is required");
        }
        return scoreProfileRepository.findById(scoreProfileId)
            .orElseThrow(() -> new RuntimeException("Score profile not found: " + scoreProfileId));
    }

    private void autoGenerateSectionsFromScoreProfile(Assessment assessment) {
        ScoreProfile scoreProfile = assessment.getScoreProfile();
        if (scoreProfile == null || scoreProfile.getId() == null) {
            return;
        }

        List<ScoreProfileSection> profileSections = scoreProfileSectionRepository.findByProfileId(scoreProfile.getId());
        if (profileSections.isEmpty()) {
            return;
        }

        List<AssessmentSection> sectionsToCreate = new ArrayList<>();
        for (int i = 0; i < profileSections.size(); i++) {
            ScoreProfileSection profileSection = profileSections.get(i);

            AssessmentSection section = new AssessmentSection();
            section.setAssessmentId(assessment.getId());
            section.setTitle(profileSection.getTitle());
            section.setOrder(i + 1);
            section.setType(parseSectionType(profileSection.getType()));

            sectionsToCreate.add(section);
        }

        assessmentSectionRepository.saveAll(sectionsToCreate);
    }

    private AssessmentSection.SectionType parseSectionType(String type) {
        try {
            return AssessmentSection.SectionType.valueOf(type);
        } catch (Exception ex) {
            throw new RuntimeException("Invalid score profile section type: " + type);
        }
    }

    private Long cloneQuestionWithOptions(Long sourceQuestionId) {
        AssessmentQuestion sourceQuestion = assessmentQuestionRepository.findById(sourceQuestionId)
            .orElseThrow(() -> new RuntimeException("Assessment question not found: " + sourceQuestionId));

        AssessmentQuestion clonedQuestion = AssessmentQuestion.builder()
            .originalQuestionId(sourceQuestion.getOriginalQuestionId())
            .type(sourceQuestion.getType())
            .level(sourceQuestion.getLevel())
            .difficulty(sourceQuestion.getDifficulty())
            .stem(sourceQuestion.getStem())
            .passage(sourceQuestion.getPassage())
            .explanation(sourceQuestion.getExplanation())
            .mediaUrl(sourceQuestion.getMediaUrl())
            .audioUrl(sourceQuestion.getAudioUrl())
            .build();

        AssessmentQuestion savedQuestion = assessmentQuestionRepository.save(clonedQuestion);

        List<AssessmentOption> options = assessmentOptionRepository.findByQuestionIdOrderByOrderAsc(sourceQuestionId);
        List<AssessmentOption> clonedOptions = options.stream()
            .map(option -> AssessmentOption.builder()
                .questionId(savedQuestion.getId())
                .content(option.getContent())
                .isCorrect(option.getIsCorrect())
                .order(option.getOrder())
                .build())
            .collect(Collectors.toList());

        if (!clonedOptions.isEmpty()) {
            assessmentOptionRepository.saveAll(clonedOptions);
        }

        return savedQuestion.getId();
    }

    private Long cloneQuestionGroupWithQuestions(Long sourceGroupId, Map<Long, Long> questionIdMap) {
        AssessmentQuestionGroup sourceGroup = assessmentQuestionGroupRepository.findById(sourceGroupId)
            .orElseThrow(() -> new RuntimeException("Assessment question group not found: " + sourceGroupId));

        AssessmentQuestionGroup clonedGroup = AssessmentQuestionGroup.builder()
            .originalGroupId(sourceGroup.getOriginalGroupId())
            .type(sourceGroup.getType())
            .level(sourceGroup.getLevel())
            .difficulty(sourceGroup.getDifficulty())
            .stem(sourceGroup.getStem())
            .passage(sourceGroup.getPassage())
            .explanation(sourceGroup.getExplanation())
            .mediaUrl(sourceGroup.getMediaUrl())
            .audioUrl(sourceGroup.getAudioUrl())
            .build();

        AssessmentQuestionGroup savedGroup = assessmentQuestionGroupRepository.save(clonedGroup);

        List<AssessmentGroupQuestion> groupQuestions =
            assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(sourceGroupId);
        List<AssessmentGroupQuestion> clonedGroupQuestions = new ArrayList<>();

        for (AssessmentGroupQuestion groupQuestion : groupQuestions) {
            Long clonedQuestionId = questionIdMap.computeIfAbsent(
                groupQuestion.getQuestionId(),
                this::cloneQuestionWithOptions
            );

            clonedGroupQuestions.add(
                AssessmentGroupQuestion.builder()
                    .groupId(savedGroup.getId())
                    .questionId(clonedQuestionId)
                    .order(groupQuestion.getOrder())
                    .build()
            );
        }

        if (!clonedGroupQuestions.isEmpty()) {
            assessmentGroupQuestionRepository.saveAll(clonedGroupQuestions);
        }

        return savedGroup.getId();
    }

    private void saveLog(Long assessmentId, String action, String fieldName, Object oldValue, Object newValue, Integer updatedBy, String changeSummary) {
        AssessmentLog logEntry = new AssessmentLog();
        logEntry.setAssessmentId(assessmentId);
        logEntry.setAction(action);
        logEntry.setFieldName(fieldName);
        logEntry.setOldValue(oldValue != null ? oldValue.toString() : null);
        logEntry.setNewValue(newValue != null ? newValue.toString() : null);
        logEntry.setMetadata(null);
        logEntry.setUpdatedBy(updatedBy);
        logEntry.setUpdatedByName(null);
        logEntry.setChangeSummary(changeSummary);
        assessmentLogRepository.save(logEntry);
    }
}
