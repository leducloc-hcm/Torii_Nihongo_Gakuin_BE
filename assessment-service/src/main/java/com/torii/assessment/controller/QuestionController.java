package com.torii.assessment.controller;

import com.torii.assessment.dto.question.*;
import com.torii.assessment.entity.Question;
import com.torii.assessment.service.QuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/questions")
@RequiredArgsConstructor
@Tag(name = "Questions", description = "Question management APIs")
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create a new question with optional image and audio files")
    public ResponseEntity<QuestionResponseDTO> createQuestion(
            @ModelAttribute @Valid CreateQuestionDTO dto,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "audio", required = false) MultipartFile audio) {
        QuestionResponseDTO question = questionService.createQuestion(dto, image, audio);
        return ResponseEntity.status(HttpStatus.CREATED).body(question);
    }

    @PostMapping("/bulk")
    @Operation(summary = "Bulk create questions")
    public ResponseEntity<List<QuestionResponseDTO>> bulkCreateQuestions(@Valid @RequestBody BulkCreateQuestionsDTO dto) {
        List<QuestionResponseDTO> questions = questionService.bulkCreateQuestions(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(questions);
    }

    @GetMapping
    @Operation(summary = "Get all questions with pagination and filters")
    public ResponseEntity<Map<String, Object>> getAllQuestions(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Question.QuestionType type,
            @RequestParam(required = false) Question.JLPTLevel level,
            @RequestParam(required = false) Question.Difficulty difficulty,
            @RequestParam(required = false) Question.ReadingLength readingLength,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean hasMedia,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionDTO queryDto = QueryQuestionDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .type(type)
            .level(level)
            .difficulty(difficulty)
            .readingLength(readingLength)
            .keyword(keyword)
            .hasMedia(hasMedia)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionService.getAllQuestions(queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get question statistics")
    public ResponseEntity<QuestionStatsDTO> getStatistics() {
        QuestionStatsDTO stats = questionService.getStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get questions by type")
    public ResponseEntity<Map<String, Object>> getQuestionsByType(
            @PathVariable Question.QuestionType type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionDTO queryDto = QueryQuestionDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionService.findByType(type, queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/level/{level}")
    @Operation(summary = "Get questions by JLPT level")
    public ResponseEntity<Map<String, Object>> getQuestionsByLevel(
            @PathVariable Question.JLPTLevel level,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionDTO queryDto = QueryQuestionDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionService.findByLevel(level, queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/difficulty/{difficulty}")
    @Operation(summary = "Get questions by difficulty")
    public ResponseEntity<Map<String, Object>> getQuestionsByDifficulty(
            @PathVariable Question.Difficulty difficulty,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {

        QueryQuestionDTO queryDto = QueryQuestionDTO.builder()
            .page(page != null ? page : 1)
            .limit(limit != null ? limit : 10)
            .sortBy(sortBy)
            .sortOrder(sortOrder)
            .build();

        Map<String, Object> result = questionService.findByDifficulty(difficulty, queryDto);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get question by ID")
    public ResponseEntity<QuestionResponseDTO> getQuestionById(@PathVariable Long id) {
        QuestionResponseDTO question = questionService.getQuestionById(id);
        return ResponseEntity.ok(question);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update a question with optional image and audio files")
    public ResponseEntity<QuestionResponseDTO> updateQuestion(
            @PathVariable Long id,
            @ModelAttribute @Valid UpdateQuestionDTO dto,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestPart(value = "audio", required = false) MultipartFile audio) {
        QuestionResponseDTO question = questionService.updateQuestion(id, dto, image, audio);
        return ResponseEntity.ok(question);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a question")
    public ResponseEntity<Map<String, String>> deleteQuestion(@PathVariable Long id) {
        questionService.deleteQuestion(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted successfully"));
    }

    @PostMapping("/{id}/clone")
    @Operation(summary = "Clone a question to create a new version")
    public ResponseEntity<QuestionResponseDTO> cloneQuestion(
            @PathVariable Long id,
            @RequestBody(required = false) UpdateQuestionDTO modifications) {
        QuestionResponseDTO question = questionService.cloneQuestion(id,
            modifications != null ? modifications : new UpdateQuestionDTO());
        return ResponseEntity.status(HttpStatus.CREATED).body(question);
    }

    @GetMapping("/uuid/{uuid}/versions")
    @Operation(summary = "Get all versions of a question by UUID")
    public ResponseEntity<List<QuestionResponseDTO>> getQuestionVersions(@PathVariable String uuid) {
        List<QuestionResponseDTO> versions = questionService.getQuestionVersions(uuid);
        return ResponseEntity.ok(versions);
    }

    @GetMapping("/uuid/{uuid}/version/{version}")
    @Operation(summary = "Get a specific version of a question")
    public ResponseEntity<QuestionResponseDTO> getQuestionByVersion(
            @PathVariable String uuid,
            @PathVariable Integer version) {
        QuestionResponseDTO question = questionService.getQuestionByVersion(uuid, version);
        return ResponseEntity.ok(question);
    }

    @GetMapping("/{id}/usage")
    @Operation(summary = "Check if question is used in assessments or quizzes")
    public ResponseEntity<Map<String, Object>> checkQuestionUsage(@PathVariable Long id) {
        Map<String, Object> usage = questionService.checkQuestionUsage(id);
        return ResponseEntity.ok(usage);
    }
}

