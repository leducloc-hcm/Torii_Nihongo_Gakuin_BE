package com.torii.assessment.controller;

import com.torii.assessment.dto.questiongroup.*;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.service.QuestionGroupService;
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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/question-groups")
@RequiredArgsConstructor
@Tag(name = "Question Groups", description = "Question Group management APIs")
public class QuestionGroupController {

    private final QuestionGroupService questionGroupService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create a new question group")
    public ResponseEntity<QuestionGroupResponseDTO> createQuestionGroup(
            @ModelAttribute @Valid CreateQuestionGroupDTO dto,
            @RequestParam(value = "questionIds", required = false) List<Long> questionIds,
            @RequestParam(value = "audio", required = false) MultipartFile audio,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpServletRequest request) throws IOException {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        if (questionIds != null) dto.setQuestionIds(questionIds);
        QuestionGroupResponseDTO group = questionGroupService.createQuestionGroup(dto, image, audio, userId);
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

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update a question group")
    public ResponseEntity<QuestionGroupResponseDTO> updateQuestionGroup(
            @PathVariable Long id,
            @ModelAttribute @Valid UpdateQuestionGroupDTO dto,
            @RequestParam(value = "questionIds", required = false) List<Long> questionIds,
            @RequestParam(value = "audio", required = false) MultipartFile audio,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpServletRequest request) throws IOException {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        if (questionIds != null) dto.setQuestionIds(questionIds);
        QuestionGroupResponseDTO group = questionGroupService.updateQuestionGroup(id, dto, image, audio, userId);
        return ResponseEntity.ok(group);
    }

    @PostMapping(value = "/{id}/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Add questions to a group")
    public ResponseEntity<QuestionGroupResponseDTO> addQuestionsToGroup(
            @PathVariable Long id,
            @RequestParam(value = "questionIds", required = false) List<Long> questionIds,
            @RequestParam(value = "questions", required = false) List<Long> questions,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        AddQuestionsToGroupDTO dto = AddQuestionsToGroupDTO.builder()
                .questionIds(questionIds)
                .questions(questions)
                .build();
        QuestionGroupResponseDTO group = questionGroupService.addQuestionsToGroup(id, dto, userId);
        return ResponseEntity.ok(group);
    }

    @PostMapping(value = "/{id}/questions/remove", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Remove questions from a group")
    public ResponseEntity<QuestionGroupResponseDTO> removeQuestionsFromGroup(
            @PathVariable Long id,
            @RequestParam(value = "questionIds", required = false) List<Long> questionIds,
            @RequestParam(value = "questions", required = false) List<Long> questions,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        RemoveQuestionsFromGroupDTO dto = RemoveQuestionsFromGroupDTO.builder()
                .questionIds(questionIds)
                .questions(questions)
                .build();
        QuestionGroupResponseDTO group = questionGroupService.removeQuestionsFromGroup(id, dto, userId);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a question group")
    public ResponseEntity<Map<String, String>> deleteQuestionGroup(
            @PathVariable Long id,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        questionGroupService.deleteQuestionGroup(id, userId);
        return ResponseEntity.ok(Map.of("message", "Question group deleted successfully"));
    }

    @GetMapping("/{id}/usage")
    @Operation(summary = "Check if question group is used")
    public ResponseEntity<Map<String, Object>> checkQuestionGroupUsage(@PathVariable Long id) {
        Map<String, Object> usage = questionGroupService.checkQuestionGroupUsage(id);
        return ResponseEntity.ok(usage);
    }
}

