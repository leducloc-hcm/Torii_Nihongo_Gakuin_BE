package com.torii.assessment.controller;

import com.torii.assessment.dto.assessmentquestion.AssessmentQuestionResponseDTO;
import com.torii.assessment.dto.assessmentquestion.CreateAssessmentQuestionDTO;
import com.torii.assessment.dto.assessmentquestion.QueryAssessmentQuestionDTO;
import com.torii.assessment.dto.assessmentquestion.UpdateAssessmentQuestionDTO;
import com.torii.assessment.entity.Question;
import com.torii.assessment.service.AssessmentQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assessment-questions")
@RequiredArgsConstructor
@Tag(name = "Assessment Questions", description = "CRUD APIs for assessment question copies")
public class AssessmentQuestionController {

    private final AssessmentQuestionService assessmentQuestionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create an assessment question copy (multipart)")
    public ResponseEntity<AssessmentQuestionResponseDTO> createMultipart(@Valid @ModelAttribute CreateAssessmentQuestionDTO dto) {
        AssessmentQuestionResponseDTO question = assessmentQuestionService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(question);
    }

    @GetMapping
    @Operation(summary = "List assessment questions with pagination and filters")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) Question.QuestionType type,
            @RequestParam(required = false) Question.JLPTLevel level,
            @RequestParam(required = false) Question.Difficulty difficulty,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryAssessmentQuestionDTO queryDto = QueryAssessmentQuestionDTO.builder()
                .page(page != null ? page : 1)
                .limit(limit != null ? limit : 20)
                .itemId(itemId)
                .type(type)
                .level(level)
                .difficulty(difficulty)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();

        Map<String, Object> result = assessmentQuestionService.list(queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an assessment question copy by ID")
    public ResponseEntity<AssessmentQuestionResponseDTO> get(@PathVariable Long id) {
        AssessmentQuestionResponseDTO question = assessmentQuestionService.getById(id);
        return ResponseEntity.ok(question);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update an assessment question copy (multipart)")
    public ResponseEntity<AssessmentQuestionResponseDTO> updateMultipart(
            @PathVariable Long id,
            @Valid @ModelAttribute UpdateAssessmentQuestionDTO dto) {
        AssessmentQuestionResponseDTO question = assessmentQuestionService.update(id, dto);
        return ResponseEntity.ok(question);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment question copy")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        assessmentQuestionService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Assessment question deleted successfully"));
    }
}
