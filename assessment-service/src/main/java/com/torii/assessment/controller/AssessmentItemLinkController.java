package com.torii.assessment.controller;

import com.torii.assessment.dto.itemassessment.ItemAssessmentGroupLinkDTO;
import com.torii.assessment.dto.itemassessment.ItemAssessmentQuestionLinkDTO;
import com.torii.assessment.dto.itemassessment.UpdateItemAssessmentGroupsDTO;
import com.torii.assessment.dto.itemassessment.UpdateItemAssessmentQuestionsDTO;
import com.torii.assessment.service.ItemAssessmentLinkService;
import com.torii.assessment.util.RequestAuthUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/assessment-items/{itemId}")
@RequiredArgsConstructor
@Tag(name = "Assessment Item Links", description = "Manage links between assessment items and copied questions/groups")
public class AssessmentItemLinkController {

    private final ItemAssessmentLinkService itemAssessmentLinkService;

    @GetMapping("/assessment-questions")
    @Operation(summary = "Get assessment question links for an item")
    public ResponseEntity<List<ItemAssessmentQuestionLinkDTO>> getQuestions(@PathVariable Long itemId) {
        return ResponseEntity.ok(itemAssessmentLinkService.getQuestions(itemId));
    }

    @PutMapping("/assessment-questions")
    @Operation(summary = "Replace assessment question links for an item")
    public ResponseEntity<List<ItemAssessmentQuestionLinkDTO>> replaceQuestions(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateItemAssessmentQuestionsDTO dto,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        List<ItemAssessmentQuestionLinkDTO> links = itemAssessmentLinkService.replaceQuestions(itemId, dto, userId);
        return ResponseEntity.ok(links);
    }

    @GetMapping("/assessment-question-groups")
    @Operation(summary = "Get assessment question group links for an item")
    public ResponseEntity<List<ItemAssessmentGroupLinkDTO>> getGroups(@PathVariable Long itemId) {
        return ResponseEntity.ok(itemAssessmentLinkService.getGroups(itemId));
    }

    @PutMapping("/assessment-question-groups")
    @Operation(summary = "Replace assessment question group links for an item")
    public ResponseEntity<List<ItemAssessmentGroupLinkDTO>> replaceGroups(
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateItemAssessmentGroupsDTO dto,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        List<ItemAssessmentGroupLinkDTO> links = itemAssessmentLinkService.replaceGroups(itemId, dto, userId);
        return ResponseEntity.ok(links);
    }

    @DeleteMapping("/assessment-questions")
    @Operation(summary = "Remove all assessment question links for an item")
    public ResponseEntity<Map<String, String>> clearQuestions(
            @PathVariable Long itemId,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        itemAssessmentLinkService.replaceQuestions(itemId, new UpdateItemAssessmentQuestionsDTO(), userId);
        return ResponseEntity.ok(Map.of("message", "Assessment questions cleared for item"));
    }

    @DeleteMapping("/assessment-question-groups")
    @Operation(summary = "Remove all assessment question group links for an item")
    public ResponseEntity<Map<String, String>> clearGroups(
            @PathVariable Long itemId,
            HttpServletRequest request) {
        Integer userId = RequestAuthUtil.requireUser(request).userId();
        itemAssessmentLinkService.replaceGroups(itemId, new UpdateItemAssessmentGroupsDTO(), userId);
        return ResponseEntity.ok(Map.of("message", "Assessment question groups cleared for item"));
    }
}
