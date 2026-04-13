package com.torii.assessment.controller;

import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.dto.assessment.AssessmentListResponseDTO;
import com.torii.assessment.dto.assessment.CreateAssessmentDTO;
import com.torii.assessment.dto.assessment.QueryAssessmentDTO;
import com.torii.assessment.dto.assessment.UpdateAssessmentDTO;
import com.torii.assessment.service.AssessmentService;
import com.torii.assessment.util.RequestAuthUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/assessment")
@RequiredArgsConstructor
@Tag(name = "Assessments", description = "Assessment management APIs")
public class AssessmentController {

    private final AssessmentService assessmentService;
    private static final Set<String> WRITE_ROLES = Set.of("STAFF", "LECTURER", "ADMIN");

    @PostMapping
    @Operation(summary = "Create a new assessment")
    public ResponseEntity<AssessmentDTO> createAssessment(
            @Valid @RequestBody CreateAssessmentDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.requireUser(request);
        requireWriteRole(authUser.role());

        dto.setCreatedBy(authUser.userId());
        AssessmentDTO assessment = assessmentService.createAssessment(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(assessment);
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Clone an assessment with full structure for editing")
    public ResponseEntity<AssessmentDTO> cloneAssessment(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.requireUser(request);
        requireWriteRole(authUser.role());

        AssessmentDTO cloned = assessmentService.cloneAssessment(id, authUser.userId());
        return ResponseEntity.status(HttpStatus.CREATED).body(cloned);
    }

    @GetMapping
    @Operation(summary = "Get all assessments with pagination and filters")
    public ResponseEntity<AssessmentListResponseDTO> getAllAssessments(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) Long classId,
            @RequestParam(required = false) Long scoreProfileId,
            @RequestParam(required = false) Integer lessonId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryAssessmentDTO queryDto = QueryAssessmentDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 20)
            .level(level)
            .type(type)
            .visibility(visibility)
            .classId(classId)
            .scoreProfileId(scoreProfileId)
            .lessonId(lessonId)
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
            @Valid @RequestBody UpdateAssessmentDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.requireUser(request);
        requireWriteRole(authUser.role());

        dto.setUpdatedBy(authUser.userId());
        AssessmentDTO assessment = assessmentService.updateAssessment(id, dto);
        return ResponseEntity.ok(assessment);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment")
    public ResponseEntity<Map<String, String>> deleteAssessment(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.requireUser(request);
        requireWriteRole(authUser.role());

        assessmentService.deleteAssessment(id, authUser.userId());
        return ResponseEntity.ok(Map.of("message", "Assessment deleted successfully"));
    }

    private void requireWriteRole(String role) {
        if (!WRITE_ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only STAFF, LECTURER, ADMIN are allowed to create/update/delete assessments");
        }
    }
}
