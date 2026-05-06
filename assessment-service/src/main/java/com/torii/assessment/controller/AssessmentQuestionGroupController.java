package com.torii.assessment.controller;

import com.torii.assessment.dto.assessmentquestiongroup.AssessmentQuestionGroupResponseDTO;
import com.torii.assessment.dto.assessmentquestiongroup.CreateAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.ModifyAssessmentGroupQuestionsDTO;
import com.torii.assessment.dto.assessmentquestiongroup.QueryAssessmentQuestionGroupDTO;
import com.torii.assessment.dto.assessmentquestiongroup.UpdateAssessmentQuestionGroupDTO;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.service.AssessmentQuestionGroupService;
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
@RequestMapping("/assessment-question-groups")
@RequiredArgsConstructor
@Tag(name = "Assessment Question Groups", description = "CRUD APIs for assessment question groups")
public class AssessmentQuestionGroupController {

    private final AssessmentQuestionGroupService assessmentQuestionGroupService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create an assessment question group (multipart)")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> createMultipart(
            @Valid @ModelAttribute CreateAssessmentQuestionGroupDTO dto,
            @RequestParam(value = "assessmentQuestionIds", required = false) List<Long> assessmentQuestionIds,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "audio", required = false) MultipartFile audio,
            HttpServletRequest request) throws IOException {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        if (assessmentQuestionIds != null) dto.setAssessmentQuestionIds(assessmentQuestionIds);
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.create(dto, image, audio, userId);
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

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update an assessment question group (multipart)")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> updateMultipart(
            @PathVariable Long id,
            @Valid @ModelAttribute UpdateAssessmentQuestionGroupDTO dto,
            @RequestParam(value = "assessmentQuestionIds", required = false) List<Long> assessmentQuestionIds,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "audio", required = false) MultipartFile audio,
            HttpServletRequest request) throws IOException {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        if (assessmentQuestionIds != null) dto.setAssessmentQuestionIds(assessmentQuestionIds);
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.update(id, dto, image, audio, userId);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an assessment question group")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable Long id,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        assessmentQuestionGroupService.delete(id, userId);
        return ResponseEntity.ok(Map.of("message", "Assessment question group deleted successfully"));
    }

    @PostMapping(value = "/{id}/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Add questions to an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> addQuestions(
            @PathVariable Long id,
            @RequestParam(value = "assessmentQuestionIds") List<Long> assessmentQuestionIds,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        ModifyAssessmentGroupQuestionsDTO dto = ModifyAssessmentGroupQuestionsDTO.builder()
                .assessmentQuestionIds(assessmentQuestionIds)
                .build();
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.addQuestions(id, dto, userId);
        return ResponseEntity.ok(group);
    }

    @PostMapping(value = "/{id}/questions/remove", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Remove questions from an assessment question group")
    public ResponseEntity<AssessmentQuestionGroupResponseDTO> removeQuestions(
            @PathVariable Long id,
            @RequestParam(value = "assessmentQuestionIds") List<Long> assessmentQuestionIds,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        ModifyAssessmentGroupQuestionsDTO dto = ModifyAssessmentGroupQuestionsDTO.builder()
                .assessmentQuestionIds(assessmentQuestionIds)
                .build();
        AssessmentQuestionGroupResponseDTO group = assessmentQuestionGroupService.removeQuestions(id, dto, userId);
        return ResponseEntity.ok(group);
    }
}
