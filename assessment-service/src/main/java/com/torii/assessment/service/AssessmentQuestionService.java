package com.torii.assessment.service;

import com.torii.assessment.dto.assessmentoption.AssessmentOptionResponseDTO;
import com.torii.assessment.dto.assessmentquestion.AssessmentQuestionResponseDTO;
import com.torii.assessment.dto.assessmentquestion.CreateAssessmentQuestionDTO;
import com.torii.assessment.dto.assessmentquestion.QueryAssessmentQuestionDTO;
import com.torii.assessment.dto.assessmentquestion.UpdateAssessmentQuestionDTO;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentOption;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.Question;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
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
public class AssessmentQuestionService {

    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentItemRepository assessmentItemRepository;

    @Transactional
    public AssessmentQuestionResponseDTO create(CreateAssessmentQuestionDTO dto) {
        AssessmentItem item = assessmentItemRepository.findById(dto.getItemId())
            .orElseThrow(() -> new RuntimeException("Assessment item not found: " + dto.getItemId()));

        AssessmentQuestion question = AssessmentQuestion.builder()
                .originalQuestionId(dto.getOriginalQuestionId())
                .type(dto.getType())
                .level(dto.getLevel())
                .difficulty(dto.getDifficulty() != null ? dto.getDifficulty() : Question.Difficulty.MEDIUM)
                .stem(dto.getStem())
                .passage(dto.getPassage())
                .explanation(dto.getExplanation())
                .mediaUrl(dto.getMediaUrl())
                .audioUrl(dto.getAudioUrl())
                .build();

        AssessmentQuestion saved = assessmentQuestionRepository.save(question);

        if (dto.getOptions() != null && !dto.getOptions().isEmpty()) {
            List<AssessmentOption> options = new ArrayList<>();
            for (int i = 0; i < dto.getOptions().size(); i++) {
                CreateAssessmentQuestionDTO.CreateAssessmentOptionInlineDTO opt = dto.getOptions().get(i);
                options.add(AssessmentOption.builder()
                        .questionId(saved.getId())
                        .content(opt.getContent())
                        .isCorrect(opt.getIsCorrect() != null ? opt.getIsCorrect() : false)
                        .order(opt.getOrder() != null ? opt.getOrder() : i)
                        .build());
            }
            assessmentOptionRepository.saveAll(options);
        }

        int nextOrder = assessmentItemRepository.findQuestionIdsByItemId(item.getId()).size();
        assessmentItemRepository.insertQuestionLink(item.getId(), saved.getId(), nextOrder);

        log.info("Created assessment question copy {}", saved.getId());
        return getById(saved.getId());
    }

    public Map<String, Object> list(QueryAssessmentQuestionDTO queryDto) {
        int page = queryDto.getPage() != null ? Math.max(queryDto.getPage(), 1) : 1;
        int limit = queryDto.getLimit() != null ? Math.min(Math.max(queryDto.getLimit(), 1), 100) : 20;

        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(queryDto.getSortOrder()) ? Sort.Direction.DESC : Sort.Direction.ASC,
                queryDto.getSortBy() != null ? queryDto.getSortBy() : "createdAt"
        );
        Pageable pageable = PageRequest.of(page - 1, limit, sort);

        Specification<AssessmentQuestion> spec = buildSpec(queryDto);
        Page<AssessmentQuestion> questionPage = assessmentQuestionRepository.findAll(spec, pageable);

        List<AssessmentQuestionResponseDTO> data = questionPage.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", questionPage.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", questionPage.getTotalPages());
        pagination.put("hasNext", questionPage.hasNext());
        pagination.put("hasPrev", questionPage.hasPrevious());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("data", data);
        result.put("pagination", pagination);
        return result;
    }

    public AssessmentQuestionResponseDTO getById(Long id) {
        AssessmentQuestion question = assessmentQuestionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment question not found: " + id));
        return mapToResponse(question);
    }

    @Transactional
    public AssessmentQuestionResponseDTO update(Long id, UpdateAssessmentQuestionDTO dto) {
        AssessmentQuestion question = assessmentQuestionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment question not found: " + id));

        if (dto.getType() != null) question.setType(dto.getType());
        if (dto.getLevel() != null) question.setLevel(dto.getLevel());
        if (dto.getDifficulty() != null) question.setDifficulty(dto.getDifficulty());
        if (dto.getStem() != null) question.setStem(dto.getStem());
        if (dto.getPassage() != null) question.setPassage(dto.getPassage());
        if (dto.getExplanation() != null) question.setExplanation(dto.getExplanation());
        if (dto.getMediaUrl() != null) question.setMediaUrl(dto.getMediaUrl());
        if (dto.getAudioUrl() != null) question.setAudioUrl(dto.getAudioUrl());

        assessmentQuestionRepository.save(question);
        log.info("Updated assessment question copy {}", id);
        return mapToResponse(question);
    }

    @Transactional
    public void delete(Long id) {
        if (!assessmentQuestionRepository.existsById(id)) {
            throw new RuntimeException("Assessment question not found: " + id);
        }
        assessmentOptionRepository.deleteAllByQuestionId(id);
        assessmentQuestionRepository.deleteById(id);
        log.info("Deleted assessment question copy {}", id);
    }

    private Specification<AssessmentQuestion> buildSpec(QueryAssessmentQuestionDTO queryDto) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (queryDto.getItemId() != null) {
                List<Long> questionIds = assessmentItemRepository.findQuestionIdsByItemId(queryDto.getItemId());
                if (questionIds.isEmpty()) {
                    return cb.disjunction();
                }
                predicates.add(root.get("id").in(questionIds));
            }
            if (queryDto.getType() != null) {
                predicates.add(cb.equal(root.get("type"), queryDto.getType()));
            }
            if (queryDto.getLevel() != null) {
                predicates.add(cb.equal(root.get("level"), queryDto.getLevel()));
            }
            if (queryDto.getDifficulty() != null) {
                predicates.add(cb.equal(root.get("difficulty"), queryDto.getDifficulty()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private AssessmentQuestionResponseDTO mapToResponse(AssessmentQuestion question) {
        List<AssessmentOptionResponseDTO> options = assessmentOptionRepository
                .findByQuestionIdOrderByOrderAsc(question.getId()).stream()
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
                .id(question.getId())
                .originalQuestionId(question.getOriginalQuestionId())
                .type(question.getType())
                .level(question.getLevel())
                .difficulty(question.getDifficulty())
                .stem(question.getStem())
                .passage(question.getPassage())
                .explanation(question.getExplanation())
                .mediaUrl(question.getMediaUrl())
                .audioUrl(question.getAudioUrl())
                .createdAt(question.getCreatedAt())
                .options(options)
                .build();
    }
}
