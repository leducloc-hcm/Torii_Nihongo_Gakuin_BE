package com.torii.assessment.controller;

import com.torii.assessment.dto.assessmentoption.AssessmentOptionResponseDTO;
import com.torii.assessment.dto.assessmentoption.CreateAssessmentOptionDTO;
import com.torii.assessment.dto.assessmentoption.QueryAssessmentOptionDTO;
import com.torii.assessment.dto.assessmentoption.UpdateAssessmentOptionDTO;
import com.torii.assessment.service.AssessmentOptionService;
import com.torii.assessment.util.RequestAuthUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "Assessment Options", description = "CRUD APIs for assessment question options")
public class AssessmentOptionController {

    private final AssessmentOptionService assessmentOptionService;

    @PostMapping(value = "/assessment-questions/{questionId}/options", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create an assessment option (multipart)")
    public ResponseEntity<AssessmentOptionResponseDTO> createMultipart(
            @PathVariable Long questionId,
            @Valid @ModelAttribute CreateAssessmentOptionDTO dto,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        dto.setQuestionId(questionId);
        AssessmentOptionResponseDTO option = assessmentOptionService.create(dto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(option);
    }

    @GetMapping("/assessment-questions/{questionId}/options")
    @Operation(summary = "List options for an assessment question")
    public ResponseEntity<Map<String, Object>> listByQuestion(
            @PathVariable Long questionId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Boolean isCorrect,
            @RequestParam(required = false, defaultValue = "order") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortOrder) {

        QueryAssessmentOptionDTO queryDto = QueryAssessmentOptionDTO.builder()
                .page(page != null ? page : 1)
                .limit(limit != null ? limit : 20)
                .isCorrect(isCorrect)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();

        Map<String, Object> result = assessmentOptionService.listByQuestion(questionId, queryDto);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/assessment-questions/{questionId}/options")
    @Operation(summary = "Delete all options for an assessment question")
    public ResponseEntity<Map<String, String>> deleteAllByQuestion(@PathVariable Long questionId) {
        assessmentOptionService.deleteAllByQuestion(questionId);
        return ResponseEntity.ok(Map.of("message", "All assessment options deleted successfully"));
    }

    @GetMapping("/assessment-options/{id}")
    @Operation(summary = "Get an assessment option by ID")
    public ResponseEntity<AssessmentOptionResponseDTO> get(@PathVariable Long id) {
        AssessmentOptionResponseDTO option = assessmentOptionService.getById(id);
        return ResponseEntity.ok(option);
    }

    @PutMapping(value = "/assessment-options/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update an assessment option (multipart)")
    public ResponseEntity<AssessmentOptionResponseDTO> updateMultipart(
            @PathVariable Long id,
            @Valid @ModelAttribute UpdateAssessmentOptionDTO dto,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        AssessmentOptionResponseDTO option = assessmentOptionService.update(id, dto, userId);
        return ResponseEntity.ok(option);
    }

    @DeleteMapping("/assessment-options/{id}")
    @Operation(summary = "Delete an assessment option")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        assessmentOptionService.delete(id, userId);
        return ResponseEntity.ok(Map.of("message", "Assessment option deleted successfully"));
    }
}
