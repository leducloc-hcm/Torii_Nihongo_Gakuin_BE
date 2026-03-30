package com.torii.assessment.controller;

import com.torii.assessment.dto.answer.AnswerDTO;
import com.torii.assessment.dto.answer.AssessmentAnswerSummaryDTO;
import com.torii.assessment.dto.answer.CreateAssessmentAnswerDTO;
import com.torii.assessment.dto.answer.UpdateAssessmentAnswerDTO;
import com.torii.assessment.service.AssessmentAnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/assessment-answers")
@RequiredArgsConstructor
public class AssessmentAnswerController {

    private final AssessmentAnswerService assessmentAnswerService;

    @PostMapping
    public ResponseEntity<AnswerDTO> createAnswer(@Valid @RequestBody CreateAssessmentAnswerDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assessmentAnswerService.createAnswer(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnswerDTO> getAnswer(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentAnswerService.getAnswerById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnswerDTO> updateAnswer(@PathVariable Long id, @RequestBody UpdateAssessmentAnswerDTO dto) {
        return ResponseEntity.ok(assessmentAnswerService.updateAnswer(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAnswer(@PathVariable Long id) {
        assessmentAnswerService.deleteAnswer(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/attempt/{attemptId}")
    public ResponseEntity<List<AnswerDTO>> getAttemptAnswers(@PathVariable Long attemptId) {
        return ResponseEntity.ok(assessmentAnswerService.getAttemptAnswers(attemptId));
    }

    @GetMapping("/attempt/{attemptId}/summary")
    public ResponseEntity<AssessmentAnswerSummaryDTO> getAttemptSummary(@PathVariable Long attemptId) {
        return ResponseEntity.ok(assessmentAnswerService.getAttemptSummary(attemptId));
    }

    @GetMapping("/attempt/{attemptId}/progress")
    public ResponseEntity<AssessmentAnswerSummaryDTO> getAttemptProgress(@PathVariable Long attemptId) {
        return ResponseEntity.ok(assessmentAnswerService.getAttemptProgress(attemptId));
    }

    @DeleteMapping("/attempt/{attemptId}")
    public ResponseEntity<Map<String, Long>> deleteAttemptAnswers(@PathVariable Long attemptId) {
        long deletedCount = assessmentAnswerService.deleteAttemptAnswers(attemptId);
        return ResponseEntity.ok(Map.of("deletedCount", deletedCount));
    }
}
