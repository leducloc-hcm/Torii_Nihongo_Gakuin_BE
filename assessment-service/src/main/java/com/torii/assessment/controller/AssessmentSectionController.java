package com.torii.assessment.controller;

import com.torii.assessment.dto.section.*;
import com.torii.assessment.service.AssessmentSectionService;
import com.torii.assessment.util.RequestAuthUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assessment-sections")
@RequiredArgsConstructor
@Tag(name = "Assessment Sections", description = "Assessment section management APIs")
public class AssessmentSectionController {

    private final AssessmentSectionService assessmentSectionService;

    @PostMapping
    @Operation(summary = "Create a new assessment section")
    public ResponseEntity<AssessmentSectionDTO> create(@Valid @RequestBody CreateAssessmentSectionDTO dto,
                                                       HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assessmentSectionService.createAssessmentSection(dto, userId));
    }

    @GetMapping
    @Operation(summary = "Get all assessment sections with pagination and filters")
    public ResponseEntity<AssessmentSectionListResponseDTO> findAll(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long assessmentId,
            @RequestParam(required = false, defaultValue = "id") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortOrder) {

        QueryAssessmentSectionDTO queryDto = QueryAssessmentSectionDTO.builder()
                .page(page != null ? page : 1)
                .limit(limit != null ? limit : 20)
                .search(search)
                .type(type)
                .assessmentId(assessmentId)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();

        return ResponseEntity.ok(assessmentSectionService.getAssessmentSections(queryDto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get assessment section by ID")
    public ResponseEntity<AssessmentSectionDTO> findOne(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentSectionService.getAssessmentSection(id));
    }

    @GetMapping("/{id}/items")
    @Operation(summary = "Get assessment section with its items")
    public ResponseEntity<AssessmentSectionWithItemsDTO> getItems(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentSectionService.getAssessmentSectionWithItems(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assessment section")
    public ResponseEntity<AssessmentSectionDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAssessmentSectionDTO dto,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        return ResponseEntity.ok(assessmentSectionService.updateAssessmentSection(id, dto, userId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment section")
    public ResponseEntity<Map<String, String>> remove(@PathVariable Long id, HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        assessmentSectionService.deleteAssessmentSection(id, userId);
        return ResponseEntity.ok(Map.of("message", "Assessment section deleted successfully"));
    }
}
