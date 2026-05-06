package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentoption.AssessmentOptionResponseDTO;
import com.torii.assessment.dto.assessmentoption.CreateAssessmentOptionDTO;
import com.torii.assessment.dto.assessmentoption.QueryAssessmentOptionDTO;
import com.torii.assessment.dto.assessmentoption.UpdateAssessmentOptionDTO;
import com.torii.assessment.entity.AssessmentOption;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.torii.assessment.service.AuditLogService.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentOptionService {

    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public AssessmentOptionResponseDTO create(CreateAssessmentOptionDTO dto, Integer updatedBy) {
        AssessmentQuestion question = assessmentQuestionRepository.findById(dto.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Assessment question not found: " + dto.getQuestionId()));

        int order = dto.getOrder() != null ? dto.getOrder()
                : assessmentOptionRepository.getMaxOrderByQuestionId(dto.getQuestionId()) + 1;

        AssessmentOption option = AssessmentOption.builder()
                .questionId(question.getId())
                .content(dto.getContent())
                .isCorrect(dto.getIsCorrect() != null ? dto.getIsCorrect() : false)
                .order(order)
                .build();

        AssessmentOption saved = assessmentOptionRepository.save(option);
        log.info("Created assessment option {} for question {}", saved.getId(), question.getId());

        auditLogService.logAction(null, ENTITY_ASSESSMENT_OPTION, saved.getId(),
                ACTION_CREATE, null, null, null, updatedBy,
                "Tạo assessment option cho question #" + question.getId(),
                Map.of("questionId", question.getId(), "content", saved.getContent()));

        return mapToResponse(saved);
    }

    public Map<String, Object> listByQuestion(Long questionId, QueryAssessmentOptionDTO queryDto) {
        if (!assessmentQuestionRepository.existsById(questionId)) {
            throw new RuntimeException("Assessment question not found: " + questionId);
        }

        int page = queryDto.getPage() != null ? Math.max(queryDto.getPage(), 1) : 1;
        int limit = queryDto.getLimit() != null ? Math.min(Math.max(queryDto.getLimit(), 1), 100) : 20;

        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
                queryDto.getSortBy() != null ? queryDto.getSortBy() : "order"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Page<AssessmentOption> pageResult = assessmentOptionRepository.findByQuestionId(questionId, pageable);
        List<AssessmentOptionResponseDTO> data = pageResult.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", pageResult.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", pageResult.getTotalPages());
        pagination.put("hasNext", pageResult.hasNext());
        pagination.put("hasPrev", pageResult.hasPrevious());

        Map<String, Object> result = new HashMap<>();
        result.put("data", data);
        result.put("pagination", pagination);
        return result;
    }

    public AssessmentOptionResponseDTO getById(Long id) {
        AssessmentOption option = assessmentOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment option not found: " + id));
        return mapToResponse(option);
    }

    @Transactional
    public AssessmentOptionResponseDTO update(Long id, UpdateAssessmentOptionDTO dto, Integer updatedBy) {
        AssessmentOption option = assessmentOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment option not found: " + id));

        if (Boolean.FALSE.equals(dto.getIsCorrect()) && Boolean.TRUE.equals(option.getIsCorrect())) {
            long correctCount = assessmentOptionRepository.countByQuestionIdAndIsCorrectTrue(option.getQuestionId());
            if (correctCount <= 1) {
                throw new IllegalArgumentException("Cannot unset the only correct option");
            }
        }

        if (dto.getContent() != null) option.setContent(dto.getContent());
        if (dto.getIsCorrect() != null) option.setIsCorrect(dto.getIsCorrect());
        if (dto.getOrder() != null) option.setOrder(dto.getOrder());

        assessmentOptionRepository.save(option);

        auditLogService.logAction(null, ENTITY_ASSESSMENT_OPTION, id,
                ACTION_UPDATE, null, null, null, updatedBy,
                "Cập nhật assessment option", null);

        log.info("Updated assessment option {}", id);
        return mapToResponse(option);
    }

    @Transactional
    public void delete(Long id, Integer updatedBy) {
        AssessmentOption option = assessmentOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment option not found: " + id));

        assessmentOptionRepository.delete(option);

        auditLogService.logAction(null, ENTITY_ASSESSMENT_OPTION, id,
                ACTION_DELETE, null, null, null, updatedBy,
                "Xóa assessment option #" + id, null);

        log.info("Deleted assessment option {}", id);
    }

    @Transactional
    public void deleteAllByQuestion(Long questionId) {
        assessmentOptionRepository.deleteAllByQuestionId(questionId);
    }

    private AssessmentOptionResponseDTO mapToResponse(AssessmentOption option) {
        return AssessmentOptionResponseDTO.builder()
                .id(option.getId())
                .questionId(option.getQuestionId())
                .content(option.getContent())
                .isCorrect(option.getIsCorrect())
                .order(option.getOrder())
                .createdAt(option.getCreatedAt())
                .build();
    }
}
