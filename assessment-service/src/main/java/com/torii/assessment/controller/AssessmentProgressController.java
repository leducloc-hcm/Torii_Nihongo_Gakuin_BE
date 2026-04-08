package com.torii.assessment.controller;

import com.torii.assessment.dto.progress.AssessmentAnswerProgressDTO;
import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.dto.progress.AssessmentProgressDTO;
import com.torii.assessment.dto.progress.AutoSaveProgressDTO;
import com.torii.assessment.dto.progress.SaveAnswerProgressDTO;
import com.torii.assessment.dto.progress.StartAssessmentProgressDTO;
import com.torii.assessment.dto.progress.SubmitAssessmentProgressDTO;
import com.torii.assessment.dto.progress.UpdateAnswerProgressDTO;
import com.torii.assessment.service.AssessmentProgressService;
import com.torii.assessment.util.RequestAuthUtil;
import jakarta.servlet.http.HttpServletRequest;
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
    public ResponseEntity<AssessmentProgressDTO> startAssessment(
            @Valid @RequestBody StartAssessmentProgressDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(assessmentProgressService.startAssessment(dto, authUser.userId()));
    }

    @PostMapping("/answers")
    public ResponseEntity<AssessmentAnswerProgressDTO> saveAnswer(
            @Valid @RequestBody SaveAnswerProgressDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(assessmentProgressService.saveAnswerProgress(dto, authUser.userId(), authUser.role()));
    }

    @PutMapping("/answers/{id}")
    public ResponseEntity<AssessmentAnswerProgressDTO> updateAnswer(
        @PathVariable Long id,
        @RequestBody UpdateAnswerProgressDTO dto,
        HttpServletRequest request
    ) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.updateAnswerProgress(id, dto, authUser.userId(), authUser.role()));
    }

    @PostMapping("/auto-save")
    public ResponseEntity<AssessmentProgressDTO> autoSave(
            @Valid @RequestBody AutoSaveProgressDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.autoSave(dto, authUser.userId(), authUser.role()));
    }

    @PostMapping("/submit")
    public ResponseEntity<AssessmentProgressDTO> submitAssessment(
            @Valid @RequestBody SubmitAssessmentProgressDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.submitAssessment(dto, authUser.userId(), authUser.role()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssessmentDTO> getProgressById(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.getProgressDetailById(id, authUser.userId(), authUser.role()));
    }

    @GetMapping("/user")
    public ResponseEntity<List<AssessmentProgressDTO>> getUserProgresses(
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.getUserProgresses(authUser.userId()));
    }

    @GetMapping("/assessment/{assessmentId}/user/{userId}")
    public ResponseEntity<AssessmentProgressDTO> getUserProgressByAssessment(
        @PathVariable Long assessmentId,
        @PathVariable Integer userId,
        HttpServletRequest request
    ) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        RequestAuthUtil.ensureSelfOrPrivileged(authUser, userId);
        return ResponseEntity.ok(assessmentProgressService.getUserProgressByAssessment(assessmentId, userId));
    }

    @GetMapping("/{id}/answers")
    public ResponseEntity<List<AssessmentAnswerProgressDTO>> getAnswersByProgress(
            @PathVariable("id") Long progressId,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(assessmentProgressService.getAnswersByProgress(progressId, authUser.userId(), authUser.role()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteProgress(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        assessmentProgressService.deleteProgress(id, authUser.userId(), authUser.role());
        return ResponseEntity.ok(Map.of("message", "Progress deleted successfully"));
    }
}
