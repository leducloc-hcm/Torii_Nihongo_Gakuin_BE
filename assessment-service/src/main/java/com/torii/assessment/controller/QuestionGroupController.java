package com.torii.assessment.controller;

import com.torii.assessment.dto.questiongroup.*;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.service.QuestionGroupService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/question-groups")
@RequiredArgsConstructor
@Tag(name = "Question Groups", description = "Question Group management APIs")
public class QuestionGroupController {

    private final QuestionGroupService questionGroupService;

    @PostMapping
    @Operation(summary = "Create a new question group")
    public ResponseEntity<QuestionGroupResponseDTO> createQuestionGroup(@Valid @RequestBody CreateQuestionGroupDTO dto) {
        QuestionGroupResponseDTO group = questionGroupService.createQuestionGroup(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    @GetMapping
    @Operation(summary = "Get all question groups with pagination and filters")
    public ResponseEntity<Map<String, Object>> getAllQuestionGroups(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) QuestionGroup.QuestionGroupType type,
            @RequestParam(required = false) Boolean hasMedia,
            @RequestParam(required = false) Boolean hasPassage,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionGroupDTO queryDto = QueryQuestionGroupDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .type(type)
            .hasMedia(hasMedia)
            .hasPassage(hasPassage)
            .keyword(keyword)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionGroupService.getAllQuestionGroups(queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get question group statistics")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        Map<String, Object> stats = questionGroupService.getStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get question groups by type")
    public ResponseEntity<Map<String, Object>> getQuestionGroupsByType(
            @PathVariable QuestionGroup.QuestionGroupType type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionGroupDTO queryDto = QueryQuestionGroupDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionGroupService.findByType(type, queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get question group by ID")
    public ResponseEntity<QuestionGroupResponseDTO> getQuestionGroupById(@PathVariable Long id) {
        QuestionGroupResponseDTO group = questionGroupService.getQuestionGroupById(id);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/{id}/questions")
    @Operation(summary = "Get questions in a group")
    public ResponseEntity<Map<String, Object>> getGroupQuestions(@PathVariable Long id) {
        Map<String, Object> result = questionGroupService.getGroupQuestions(id);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a question group")
    public ResponseEntity<QuestionGroupResponseDTO> updateQuestionGroup(
            @PathVariable Long id,
            @Valid @RequestBody UpdateQuestionGroupDTO dto) {
        QuestionGroupResponseDTO group = questionGroupService.updateQuestionGroup(id, dto);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/{id}/questions")
    @Operation(summary = "Add questions to a group")
    public ResponseEntity<QuestionGroupResponseDTO> addQuestionsToGroup(
            @PathVariable Long id,
            @Valid @RequestBody AddQuestionsToGroupDTO dto) {
        QuestionGroupResponseDTO group = questionGroupService.addQuestionsToGroup(id, dto);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}/questions")
    @Operation(summary = "Remove questions from a group")
    public ResponseEntity<QuestionGroupResponseDTO> removeQuestionsFromGroup(
            @PathVariable Long id,
            @Valid @RequestBody RemoveQuestionsFromGroupDTO dto) {
        QuestionGroupResponseDTO group = questionGroupService.removeQuestionsFromGroup(id, dto);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a question group")
    public ResponseEntity<Map<String, String>> deleteQuestionGroup(@PathVariable Long id) {
        questionGroupService.deleteQuestionGroup(id);
        return ResponseEntity.ok(Map.of("message", "Question group deleted successfully"));
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Clone a question group to create a new version")
    public ResponseEntity<QuestionGroupResponseDTO> cloneQuestionGroup(
            @PathVariable Long id,
            @RequestBody(required = false) UpdateQuestionGroupDTO modifications) {
        QuestionGroupResponseDTO group = questionGroupService.cloneQuestionGroup(id,
            modifications != null ? modifications : new UpdateQuestionGroupDTO());
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    @GetMapping("/uuid/{uuid}/versions")
    @Operation(summary = "Get all versions of a question group by UUID")
    public ResponseEntity<List<QuestionGroupResponseDTO>> getQuestionGroupVersions(@PathVariable String uuid) {
        List<QuestionGroupResponseDTO> versions = questionGroupService.getQuestionGroupVersions(uuid);
        return ResponseEntity.ok(versions);
    }

    @GetMapping("/uuid/{uuid}/version/{version}")
    @Operation(summary = "Get a specific version of a question group")
    public ResponseEntity<QuestionGroupResponseDTO> getQuestionGroupByVersion(
            @PathVariable String uuid,
            @PathVariable Integer version) {
        QuestionGroupResponseDTO group = questionGroupService.getQuestionGroupByVersion(uuid, version);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/{id}/usage")
    @Operation(summary = "Check if question group is used")
    public ResponseEntity<Map<String, Object>> checkQuestionGroupUsage(@PathVariable Long id) {
        Map<String, Object> usage = questionGroupService.checkQuestionGroupUsage(id);
        return ResponseEntity.ok(usage);
    }
}

