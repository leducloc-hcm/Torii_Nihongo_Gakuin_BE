package com.torii.assessment.controller;

import com.torii.assessment.dto.assessmentquestiongroup.AssessmentQuestionGroupResponseDTO;
import com.torii.assessment.dto.assessmentquestiongroup.CreateAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.ModifyAssessmentGroupQuestionsDTO;
import com.torii.assessment.dto.assessmentquestiongroup.QueryAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.UpdateAssessmentQuestionGroupDTO;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.service.AssessmentQuestionGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/assessment-question-groups")
@RequiredArgsConstructor
@Tag(name = "Assessment Question Groups", description = "CRUD APIs for assessment question groups")
public class AssessmentQuestionGroupController {

    private final AssessmentQuestionGroupService assessmentQuestionGroupService;

    @PostMapping
    @Operation(summary = "Create an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> create(
            @Valid @RequestBody CreateAssessmentQuestionGroupDTO dto) {
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    @GetMapping
    @Operation(summary = "List assessment question groups with pagination and filters")
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) QuestionGroup.QuestionGroupType type,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryAssessmentQuestionGroupDTO queryDto = QueryAssessmentQuestionGroupDTO.builder()
                .page(page != null ? page : 1)
                .limit(limit != null ? limit : 20)
                .itemId(itemId)
                .type(type)
                .sortBy(sortBy)
                .sortOrder(sortOrder)
                .build();

        Map<String, Object> result = assessmentQuestionGroupService.list(queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an assessment question group by ID")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> get(@PathVariable Long id) {
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.getById(id);
        return ResponseEntity.ok(group);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAssessmentQuestionGroupDTO dto) {
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.update(id, dto);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment question group")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        assessmentQuestionGroupService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Assessment question group deleted successfully"));
    }

    @PostMapping("/{id}/questions")
    @Operation(summary = "Add questions to an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> addQuestions(
            @PathVariable Long id,
            @Valid @RequestBody ModifyAssessmentGroupQuestionsDTO dto) {
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.addQuestions(id, dto);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}/questions")
    @Operation(summary = "Remove questions from an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> removeQuestions(
            @PathVariable Long id,
            @Valid @RequestBody ModifyAssessmentGroupQuestionsDTO dto) {
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.removeQuestions(id, dto);
        return ResponseEntity.ok(group);
    }
}
