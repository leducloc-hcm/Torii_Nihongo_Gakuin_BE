package com.torii.assessment.controller;

import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.dto.assessment.AssessmentListResponseDTO;
import com.torii.assessment.dto.assessment.CreateAssessmentDTO;
import com.torii.assessment.dto.assessment.QueryAssessmentDTO;
import com.torii.assessment.dto.assessment.UpdateAssessmentDTO;
import com.torii.assessment.service.AssessmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/assessment")
@RequiredArgsConstructor
@Tag(name = "Assessments", description = "Assessment management APIs")
public class AssessmentController {

    private final AssessmentService assessmentService;

    @PostMapping
    @Operation(summary = "Create a new assessment")
    public ResponseEntity<AssessmentDTO> createAssessment(@Valid @RequestBody CreateAssessmentDTO dto) {
        AssessmentDTO assessment = assessmentService.createAssessment(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(assessment);
    }

    @GetMapping
    @Operation(summary = "Get all assessments with pagination and filters")
    public ResponseEntity<AssessmentListResponseDTO> getAllAssessments(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryAssessmentDTO queryDto = QueryAssessmentDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 20)
            .level(level)
            .type(type)
            .visibility(visibility)
            .keyword(keyword)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        return ResponseEntity.ok(assessmentService.getAllAssessments(queryDto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get assessment by ID")
    public ResponseEntity<AssessmentDTO> getAssessmentById(@PathVariable Long id) {
        AssessmentDTO assessment = assessmentService.getAssessmentById(id);
        return ResponseEntity.ok(assessment);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assessment")
    public ResponseEntity<AssessmentDTO> updateAssessment(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAssessmentDTO dto) {
        AssessmentDTO assessment = assessmentService.updateAssessment(id, dto);
        return ResponseEntity.ok(assessment);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment")
    public ResponseEntity<Map<String, String>> deleteAssessment(@PathVariable Long id) {
        assessmentService.deleteAssessment(id);
        return ResponseEntity.ok(Map.of("message", "Assessment deleted successfully"));
    }
}
