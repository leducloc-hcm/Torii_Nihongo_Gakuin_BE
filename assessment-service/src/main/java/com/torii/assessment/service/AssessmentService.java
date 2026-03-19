package com.torii.assessment.service;

import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.dto.assessment.AssessmentListResponseDTO;
import com.torii.assessment.dto.assessment.CreateAssessmentDTO;
import com.torii.assessment.dto.assessment.QueryAssessmentDTO;
import com.torii.assessment.dto.assessment.UpdateAssessmentDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.repository.AssessmentRepository;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;

    @Transactional
    public AssessmentDTO createAssessment(CreateAssessmentDTO dto) {
        Assessment assessment = new Assessment();
        assessment.setTitle(dto.getTitle());
        assessment.setLevel(dto.getLevel());
        assessment.setType(dto.getType());
        assessment.setVisibility(dto.getVisibility());
        assessment.setCreatedBy(dto.getCreatedBy());
        assessment.setScoreProfileId(dto.getScoreProfileId());
        assessment.setDescription(dto.getDescription());
        assessment.setCourseId(dto.getCourseId());

        Assessment saved = assessmentRepository.save(assessment);
        log.info("Created assessment: {}", saved.getId());

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
        return mapToDTO(assessment);
    }

    @Transactional
    public AssessmentDTO updateAssessment(Long id, UpdateAssessmentDTO dto) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + id));

        if (dto.getTitle() != null) assessment.setTitle(dto.getTitle());
        if (dto.getLevel() != null) assessment.setLevel(dto.getLevel());
        if (dto.getType() != null) assessment.setType(dto.getType());
        if (dto.getVisibility() != null) assessment.setVisibility(dto.getVisibility());
        if (dto.getScoreProfileId() != null) assessment.setScoreProfileId(dto.getScoreProfileId());
        if (dto.getDescription() != null) assessment.setDescription(dto.getDescription());
        if (dto.getCourseId() != null) assessment.setCourseId(dto.getCourseId());

        Assessment updated = assessmentRepository.save(assessment);
        log.info("Updated assessment: {}", updated.getId());

        return mapToDTO(updated);
    }

    @Transactional
    public void deleteAssessment(Long id) {
        if (!assessmentRepository.existsById(id)) {
            throw new RuntimeException("Assessment not found: " + id);
        }
        assessmentRepository.deleteById(id);
        log.info("Deleted assessment: {}", id);
    }

    private Specification<Assessment> buildSpecification(QueryAssessmentDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (queryDto.getLevel() != null && !queryDto.getLevel().isBlank()) {
                predicates.add(cb.equal(root.get("level"), queryDto.getLevel()));
            }
            if (queryDto.getType() != null && !queryDto.getType().isBlank()) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            if (queryDto.getVisibility() != null && !queryDto.getVisibility().isBlank()) {
                predicates.add(cb.equal(root.get("visibility"), queryDto.getVisibility()));
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
            .level(assessment.getLevel())
            .type(assessment.getType())
            .visibility(assessment.getVisibility())
            .description(assessment.getDescription())
            .courseId(assessment.getCourseId())
            .createdBy(assessment.getCreatedBy())
            .scoreProfileId(assessment.getScoreProfileId())
            .version(assessment.getVersion())
            .createdAt(assessment.getCreatedAt())
            .updatedAt(assessment.getUpdatedAt())
            .build();
    }
}
