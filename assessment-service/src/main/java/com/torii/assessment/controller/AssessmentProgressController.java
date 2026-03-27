package com.torii.assessment.controller;

import com.torii.assessment.dto.progress.AssessmentAnswerProgressDTO;
import com.torii.assessment.dto.progress.AssessmentProgressDTO;
import com.torii.assessment.dto.progress.AutoSaveProgressDTO;
import com.torii.assessment.dto.progress.SaveAnswerProgressDTO;
import com.torii.assessment.dto.progress.StartAssessmentProgressDTO;
import com.torii.assessment.dto.progress.SubmitAssessmentProgressDTO;
import com.torii.assessment.dto.progress.UpdateAnswerProgressDTO;
import com.torii.assessment.service.AssessmentProgressService;
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
@RequestMapping("/assessment-progress")
@RequiredArgsConstructor
public class AssessmentProgressController {

    private final AssessmentProgressService assessmentProgressService;

    @PostMapping("/start")
    public ResponseEntity<AssessmentProgressDTO> startAssessment(@Valid @RequestBody StartAssessmentProgressDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assessmentProgressService.startAssessment(dto));
    }

    @PostMapping("/answers")
    public ResponseEntity<AssessmentAnswerProgressDTO> saveAnswer(@Valid @RequestBody SaveAnswerProgressDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assessmentProgressService.saveAnswerProgress(dto));
    }

    @PutMapping("/answers/{id}")
    public ResponseEntity<AssessmentAnswerProgressDTO> updateAnswer(
        @PathVariable Long id,
        @RequestBody UpdateAnswerProgressDTO dto
    ) {
        return ResponseEntity.ok(assessmentProgressService.updateAnswerProgress(id, dto));
    }

    @PostMapping("/auto-save")
    public ResponseEntity<AssessmentProgressDTO> autoSave(@Valid @RequestBody AutoSaveProgressDTO dto) {
        return ResponseEntity.ok(assessmentProgressService.autoSave(dto));
    }

    @PostMapping("/submit")
    public ResponseEntity<AssessmentProgressDTO> submitAssessment(@Valid @RequestBody SubmitAssessmentProgressDTO dto) {
        return ResponseEntity.ok(assessmentProgressService.submitAssessment(dto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssessmentProgressDTO> getProgressById(@PathVariable Long id) {
        return ResponseEntity.ok(assessmentProgressService.getProgressById(id));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AssessmentProgressDTO>> getUserProgresses(@PathVariable Integer userId) {
        return ResponseEntity.ok(assessmentProgressService.getUserProgresses(userId));
    }

    @GetMapping("/assessment/{assessmentId}/user/{userId}")
    public ResponseEntity<AssessmentProgressDTO> getUserProgressByAssessment(
        @PathVariable Long assessmentId,
        @PathVariable Integer userId
    ) {
        return ResponseEntity.ok(assessmentProgressService.getUserProgressByAssessment(assessmentId, userId));
    }

    @GetMapping("/{id}/answers")
    public ResponseEntity<List<AssessmentAnswerProgressDTO>> getAnswersByProgress(@PathVariable("id") Long progressId) {
        return ResponseEntity.ok(assessmentProgressService.getAnswersByProgress(progressId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteProgress(@PathVariable Long id) {
        assessmentProgressService.deleteProgress(id);
        return ResponseEntity.ok(Map.of("message", "Progress deleted successfully"));
    }
}
