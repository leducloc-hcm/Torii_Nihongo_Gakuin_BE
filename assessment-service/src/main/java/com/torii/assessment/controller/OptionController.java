package com.torii.assessment.controller;

import com.torii.assessment.dto.option.*;
import com.torii.assessment.service.OptionService;
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
@RequiredArgsConstructor
@Tag(name = "Question Options", description = "Option management APIs")
public class OptionController {

    private final OptionService optionService;

    @PostMapping("/questions/{questionId}/options")
    @Operation(summary = "Create a new option for a question")
    public ResponseEntity<OptionResponseDTO> createOption(
            @PathVariable Long questionId,
            @Valid @RequestBody CreateOptionDTO dto) {
        OptionResponseDTO option = optionService.createOption(questionId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(option);
    }

    @PostMapping("/questions/{questionId}/options/bulk")
    @Operation(summary = "Bulk create options for a question")
    public ResponseEntity<List<OptionResponseDTO>> bulkCreateOptions(
            @PathVariable Long questionId,
            @Valid @RequestBody BulkCreateOptionsDTO dto) {
        List<OptionResponseDTO> options = optionService.bulkCreateOptions(questionId, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(options);
    }

    @GetMapping("/questions/{questionId}/options")
    @Operation(summary = "Get options for a question with pagination")
    public ResponseEntity<Map<String, Object>> findByQuestion(
            @PathVariable Long questionId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Boolean isCorrect,
            @RequestParam(required = false, defaultValue = "order") String sortBy,
            @RequestParam(required = false, defaultValue = "asc") String sortOrder) {

        QueryOptionDTO queryDto = QueryOptionDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .isCorrect(isCorrect)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = optionService.findByQuestion(questionId, queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/questions/{questionId}/options/summary")
    @Operation(summary = "Get options summary for a question")
    public ResponseEntity<Map<String, Object>> getQuestionOptionsSummary(@PathVariable Long questionId) {
        Map<String, Object> result = optionService.getQuestionOptions(questionId);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/questions/{questionId}/options/reorder")
    @Operation(summary = "Reorder options for a question")
    public ResponseEntity<List<OptionResponseDTO>> reorderOptions(
            @PathVariable Long questionId,
            @Valid @RequestBody ReorderOptionsDTO dto) {
        List<OptionResponseDTO> options = optionService.reorderOptions(questionId, dto);
        return ResponseEntity.ok(options);
    }

    @DeleteMapping("/questions/{questionId}/options")
    @Operation(summary = "Delete all options for a question")
    public ResponseEntity<Map<String, String>> deleteAllByQuestion(@PathVariable Long questionId) {
        optionService.deleteAllByQuestion(questionId);
        return ResponseEntity.ok(Map.of("message", "All options deleted successfully"));
    }

    @GetMapping("/options/{id}")
    @Operation(summary = "Get option by ID")
    public ResponseEntity<OptionResponseDTO> getOptionById(@PathVariable Long id) {
        OptionResponseDTO option = optionService.getOptionById(id);
        return ResponseEntity.ok(option);
    }

    @PutMapping("/options/{id}")
    @Operation(summary = "Update an option")
    public ResponseEntity<OptionResponseDTO> updateOption(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOptionDTO dto) {
        OptionResponseDTO option = optionService.updateOption(id, dto);
        return ResponseEntity.ok(option);
    }

    @DeleteMapping("/options/{id}")
    @Operation(summary = "Delete an option")
    public ResponseEntity<Map<String, String>> deleteOption(@PathVariable Long id) {
        optionService.deleteOption(id);
        return ResponseEntity.ok(Map.of("message", "Option deleted successfully"));
    }
}

