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
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionGroupRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AssessmentLogRepository;
import com.torii.assessment.entity.AssessmentLog;
import com.torii.assessment.repository.AssessmentSectionRepository;
import com.torii.assessment.repository.ScoreProfileRepository;
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
        assessment.setDescription(dto.getDescription());
        assessment.setLessonId(dto.getLessonId());
        assessment.setClassId(dto.getClassId());
        assessment.setScoreProfile(resolveScoreProfile(dto.getScoreProfileId()));
        assessment.setAssignedToId(dto.getAssignedToId());
        assessment.setStartAt(dto.getStartAt());
        assessment.setDueAt(dto.getDueAt());
        assessment.setLockAfterDue(dto.getLockAfterDue());
        assessment.setTimeLimitSec(dto.getTimeLimitSec());
        assessment.setMaxAttempts(dto.getMaxAttempts());
        assessment.setShuffleQuestions(dto.getShuffleQuestions());
        assessment.setShuffleOptions(dto.getShuffleOptions());

        Assessment saved = assessmentRepository.save(assessment);
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
        if (dto.getDescription() != null) {
            saveLog(id, "UPDATE", "description", assessment.getDescription(), dto.getDescription(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setDescription(dto.getDescription());
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
        if (dto.getAssignedToId() != null) {
            saveLog(id, "UPDATE", "assignedToId", assessment.getAssignedToId(), dto.getAssignedToId(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setAssignedToId(dto.getAssignedToId());
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
        if (dto.getTimeLimitSec() != null) {
            saveLog(id, "UPDATE", "timeLimitSec", assessment.getTimeLimitSec(), dto.getTimeLimitSec(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setTimeLimitSec(dto.getTimeLimitSec());
        }
        if (dto.getMaxAttempts() != null) {
            saveLog(id, "UPDATE", "maxAttempts", assessment.getMaxAttempts(), dto.getMaxAttempts(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setMaxAttempts(dto.getMaxAttempts());
        }
        if (dto.getShuffleQuestions() != null) {
            saveLog(id, "UPDATE", "shuffleQuestions", assessment.getShuffleQuestions(), dto.getShuffleQuestions(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setShuffleQuestions(dto.getShuffleQuestions());
        }
        if (dto.getShuffleOptions() != null) {
            saveLog(id, "UPDATE", "shuffleOptions", assessment.getShuffleOptions(), dto.getShuffleOptions(), dto.getUpdatedBy(), "UPDATE_ASSESSMENT");
            assessment.setShuffleOptions(dto.getShuffleOptions());
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
            if (queryDto.getAssignedToId() != null) {
                predicates.add(cb.equal(root.get("assignedToId"), queryDto.getAssignedToId()));
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
            .description(assessment.getDescription())
            .createdBy(assessment.getCreatedBy())
            .lessonId(assessment.getLessonId())
            .classId(assessment.getClassId())
            .scoreProfileId(assessment.getScoreProfile() != null ? assessment.getScoreProfile().getId() : null)
            .assignedToId(assessment.getAssignedToId())
            .lockAfterDue(assessment.getLockAfterDue())
            .timeLimitSec(assessment.getTimeLimitSec())
            .maxAttempts(assessment.getMaxAttempts())
            .shuffleQuestions(assessment.getShuffleQuestions())
            .shuffleOptions(assessment.getShuffleOptions())
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

                        return AssessmentDTO.QuestionGroupDetailDTO.builder()
                            .id(g.getId())
                            .originalGroupId(g.getOriginalGroupId())
                            .type(g.getType() != null ? g.getType().name() : null)
                            .title(g.getTitle())
                            .passage(g.getPassage())
                            .mediaUrl(g.getMediaUrl())
                            .audioUrl(g.getAudioUrl())
                            .metadata(g.getMetadata())
                            .questionIds(groupQuestionIds)
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
