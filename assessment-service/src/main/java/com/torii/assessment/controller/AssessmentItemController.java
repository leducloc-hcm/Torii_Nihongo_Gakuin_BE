package com.torii.assessment.controller;

import com.torii.assessment.dto.assessmentitem.AssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.AssessmentItemListResponseDTO;
import com.torii.assessment.dto.assessmentitem.CreateAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.QueryAssessmentItemDTO;
import com.torii.assessment.dto.assessmentitem.UpdateAssessmentItemDTO;
import com.torii.assessment.service.AssessmentItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assessment-items")
@RequiredArgsConstructor
@Tag(name = "Assessment Items", description = "Assessment item management APIs")
public class AssessmentItemController {

    private final AssessmentItemService assessmentItemService;

    @PostMapping
    @Operation(summary = "Create a new assessment item")
    public ResponseEntity<AssessmentItemDTO> createAssessmentItem(@Valid @RequestBody CreateAssessmentItemDTO dto) {
        AssessmentItemDTO item = assessmentItemService.createAssessmentItem(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @GetMapping
    @Operation(summary = "Get all assessment items with pagination and filters")
    public ResponseEntity<AssessmentItemListResponseDTO> getAllAssessmentItems(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long sectionId,
            @RequestParam(required = false, defaultValue = "order") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortOrder) {

        QueryAssessmentItemDTO queryDto = QueryAssessmentItemDTO.builder()
                .page(page != null ? page : 1)
                .limit(limit != null ? limit : 20)
                .sectionId(sectionId)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();

        return ResponseEntity.ok(assessmentItemService.getAssessmentItems(queryDto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get assessment item by ID")
    public ResponseEntity<AssessmentItemDTO> getAssessmentItemById(@PathVariable Long id) {
        AssessmentItemDTO item = assessmentItemService.getAssessmentItem(id);
        return ResponseEntity.ok(item);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assessment item")
    public ResponseEntity<AssessmentItemDTO> updateAssessmentItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAssessmentItemDTO dto) {
        AssessmentItemDTO item = assessmentItemService.updateAssessmentItem(id, dto);
        return ResponseEntity.ok(item);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment item")
    public ResponseEntity<Map<String, String>> deleteAssessmentItem(@PathVariable Long id) {
        assessmentItemService.deleteAssessmentItem(id);
        return ResponseEntity.ok(Map.of("message", "Assessment item deleted successfully"));
    }
}
