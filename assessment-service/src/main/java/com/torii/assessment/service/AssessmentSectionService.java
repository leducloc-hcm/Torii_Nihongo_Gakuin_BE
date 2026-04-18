package com.torii.assessment.service;

import com.torii.assessment.dto.section.ItemDTO;
import com.torii.assessment.dto.section.*;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentSection;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AssessmentSectionRepository;
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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.torii.assessment.service.AuditLogService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentSectionService {

    private final AssessmentSectionRepository assessmentSectionRepository;
    private final AssessmentItemRepository assessmentItemRepository;
    private final AssessmentRepository assessmentRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public AssessmentSectionDTO createAssessmentSection(CreateAssessmentSectionDTO dto, Integer updatedBy) {
        if (!assessmentRepository.existsById(dto.getAssessmentId())) {
            throw new RuntimeException("Assessment with ID " + dto.getAssessmentId() + " not found");
        }

        AssessmentSection section = new AssessmentSection();
        section.setAssessmentId(dto.getAssessmentId());
        section.setTitle(dto.getTitle());
        section.setType(AssessmentSection.SectionType.valueOf(dto.getType()));
        section.setTimeLimitSec(dto.getTimeLimitSec());
        section.setOrder(dto.getOrder());

        AssessmentSection saved = assessmentSectionRepository.save(section);
        log.info("Created assessment section: {}", saved.getId());

        auditLogService.logAction(dto.getAssessmentId(), ENTITY_SECTION, saved.getId(),
                ACTION_CREATE, updatedBy, "CREATE_SECTION",
                Map.of("title", saved.getTitle() != null ? saved.getTitle() : "",
                       "type", saved.getType() != null ? saved.getType().name() : ""));

        return mapToDTO(saved);
    }

    public AssessmentSectionDTO getAssessmentSection(Long id) {
        AssessmentSection section = assessmentSectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment section with ID " + id + " not found"));
        return mapToDTO(section);
    }

    public AssessmentSectionWithItemsDTO getAssessmentSectionWithItems(Long id) {
        AssessmentSection section = assessmentSectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment section with ID " + id + " not found"));

        List<AssessmentItem> items = assessmentItemRepository.findBySectionIdOrderByOrderAsc(id);

        List<ItemDTO> itemDTOs = items.stream().map(item -> {
            ItemDTO dto = new ItemDTO();
            dto.setId(item.getId());
            dto.setName(item.getName());
            dto.setScorePerQuestion(item.getScorePerQuestion());
            dto.setOrder(item.getOrder());
            dto.setQuestionIds(assessmentItemRepository.findQuestionIdsByItemId(item.getId()));
            dto.setGroupIds(assessmentItemRepository.findGroupIdsByItemId(item.getId()));
            return dto;
        }).collect(Collectors.toList());

        return AssessmentSectionWithItemsDTO.builder()
                .id(section.getId())
                .assessmentId(section.getAssessmentId())
                .title(section.getTitle())
                .timeLimitSec(section.getTimeLimitSec())
                .type(section.getType() != null ? section.getType().name() : null)
            .order(section.getOrder())
            .createdAt(section.getCreatedAt())
            .updatedAt(section.getUpdatedAt())
                .items(itemDTOs)
                .build();
    }

    @Transactional
    public AssessmentSectionDTO updateAssessmentSection(Long id, UpdateAssessmentSectionDTO dto, Integer updatedBy) {
        AssessmentSection section = assessmentSectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment section with ID " + id + " not found"));

        Long assessmentId = section.getAssessmentId();

        if (dto.getTitle() != null) {
            boolean titleExists = assessmentSectionRepository
                    .existsByAssessmentIdAndTitleAndIdNot(section.getAssessmentId(), dto.getTitle(), id);
            if (titleExists) {
                throw new RuntimeException(
                        "Section with title \"" + dto.getTitle() + "\" already exists in this assessment");
            }
            auditLogService.logFieldChange(assessmentId, ENTITY_SECTION, id, "title", section.getTitle(), dto.getTitle(), updatedBy);
            section.setTitle(dto.getTitle());
        }

        if (dto.getType() != null) {
            auditLogService.logFieldChange(assessmentId, ENTITY_SECTION, id, "type", section.getType(), dto.getType(), updatedBy);
            section.setType(AssessmentSection.SectionType.valueOf(dto.getType()));
        }
        if (dto.getTimeLimitSec() != null) {
            auditLogService.logFieldChange(assessmentId, ENTITY_SECTION, id, "timeLimitSec", section.getTimeLimitSec(), dto.getTimeLimitSec(), updatedBy);
            section.setTimeLimitSec(dto.getTimeLimitSec());
        }
        if (dto.getOrder() != null) {
            auditLogService.logFieldChange(assessmentId, ENTITY_SECTION, id, "order", section.getOrder(), dto.getOrder(), updatedBy);
            section.setOrder(dto.getOrder());
        }

        AssessmentSection updated = assessmentSectionRepository.save(section);
        log.info("Updated assessment section: {}", updated.getId());

        return mapToDTO(updated);
    }

    @Transactional
    public void deleteAssessmentSection(Long id, Integer updatedBy) {
        AssessmentSection section = assessmentSectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment section with ID " + id + " not found"));

        auditLogService.logAction(section.getAssessmentId(), ENTITY_SECTION, id,
                ACTION_DELETE, updatedBy, "DELETE_SECTION",
                Map.of("title", section.getTitle() != null ? section.getTitle() : ""));

        assessmentSectionRepository.deleteById(id);
        log.info("Deleted assessment section: {}", id);
    }

    public AssessmentSectionListResponseDTO getAssessmentSections(QueryAssessmentSectionDTO queryDto) {
        int page = queryDto.getPage() != null ? queryDto.getPage() : 1;
        int limit = queryDto.getLimit() != null ? queryDto.getLimit() : 20;

        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
                queryDto.getSortBy() != null ? queryDto.getSortBy() : "id"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<AssessmentSection> spec = buildSpecification(queryDto);
        Page<AssessmentSection> sectionPage = assessmentSectionRepository.findAll(spec, pageable);

        List<AssessmentSectionDTO> data = sectionPage.getContent().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        AssessmentSectionListResponseDTO.PaginationDTO pagination = new AssessmentSectionListResponseDTO.PaginationDTO(
                sectionPage.getTotalElements(),
                page,
                limit,
                sectionPage.getTotalPages(),
                sectionPage.hasNext(),
                sectionPage.hasPrevious()
        );

        return new AssessmentSectionListResponseDTO(data, pagination);
    }

    private Specification<AssessmentSection> buildSpecification(QueryAssessmentSectionDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getSearch() != null && !queryDto.getSearch().isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")),
                        "%" + queryDto.getSearch().toLowerCase() + "%"));
            }

            if (queryDto.getType() != null && !queryDto.getType().isBlank()) {
                predicates.add(cb.equal(root.get("type"), AssessmentSection.SectionType.valueOf(queryDto.getType())));
            }

            if (queryDto.getAssessmentId() != null) {
                predicates.add(cb.equal(root.get("assessmentId"), queryDto.getAssessmentId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AssessmentSectionDTO mapToDTO(AssessmentSection section) {
        long itemCount = assessmentSectionRepository.countItemsBySectionId(section.getId());
        return AssessmentSectionDTO.builder()
                .id(section.getId())
                .assessmentId(section.getAssessmentId())
                .title(section.getTitle())
                .timeLimitSec(section.getTimeLimitSec())
                .type(section.getType() != null ? section.getType().name() : null)
            .order(section.getOrder())
            .createdAt(section.getCreatedAt())
            .updatedAt(section.getUpdatedAt())
                .itemCount(itemCount)
                .build();
    }
}
