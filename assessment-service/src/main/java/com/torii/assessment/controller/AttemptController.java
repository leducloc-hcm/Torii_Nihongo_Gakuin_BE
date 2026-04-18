package com.torii.assessment.controller;

import com.torii.assessment.dto.attempt.AttemptDTO;
import com.torii.assessment.dto.attempt.AttemptReviewDetailDTO;
import com.torii.assessment.dto.attempt.AttemptedAssessmentListResponseDTO;
import com.torii.assessment.dto.attempt.CreateAttemptDTO;
import com.torii.assessment.dto.attempt.SubmitAnswerDTO;
import com.torii.assessment.dto.attempt.SubmitAttemptRequestDTO;
import com.torii.assessment.dto.attempt.WrongAnswerLabGradeRequestDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.service.AttemptService;
import com.torii.assessment.service.AttemptReviewService;
import com.torii.assessment.util.RequestAuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/assessment/attempts", "/assessment-attempts"})
@RequiredArgsConstructor
public class AttemptController {
    
    private final AttemptService attemptService;
    private final AttemptReviewService attemptReviewService;
    
    @PostMapping
    public ResponseEntity<AttemptDTO> createAttempt(
            @Valid @RequestBody CreateAttemptDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        dto.setUserId(authUser.userId());
        AttemptDTO attempt = attemptService.createAttempt(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<AttemptDTO> getAttemptById(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        AttemptDTO attempt = attemptService.getAttemptById(id, authUser.userId(), authUser.role());
        return ResponseEntity.ok(attempt);
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AttemptDTO>> getUserAttempts(
            @PathVariable Integer userId,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        RequestAuthUtil.ensureSelfOrPrivileged(authUser, userId);
        List<AttemptDTO> attempts = attemptService.getUserAttempts(userId);
        return ResponseEntity.ok(attempts);
    }
    
    @PostMapping("/{id}/answers")
    public ResponseEntity<Void> submitAnswer(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAnswerDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        attemptService.submitAnswer(id, dto, authUser.userId(), authUser.role());
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{id}/submit")
    public ResponseEntity<AttemptDTO> submitAttempt(
            @PathVariable Long id,
            @RequestBody(required = false) @Valid SubmitAttemptRequestDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        AttemptDTO attempt = attemptService.submitAttempt(id, dto, authUser.userId(), authUser.role());
        return ResponseEntity.ok(attempt);
    }
    
    @GetMapping("/{id}/results")
    public ResponseEntity<AttemptDTO> getAttemptResults(
            @PathVariable Long id,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        AttemptDTO attempt = attemptService.getAttemptResults(id, authUser.userId(), authUser.role());
        return ResponseEntity.ok(attempt);
    }

    @GetMapping("/attempted/all")
    public ResponseEntity<AttemptedAssessmentListResponseDTO> getAttemptedAssessments(
            @RequestParam(required = false) Assessment.AssessmentType type,
            @RequestParam(required = false) Assessment.JLPTLevel level,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.getAttemptedAssessments(
            authUser.userId(),
            type,
            level,
            page,
            limit
        ));
    }

    @GetMapping("/attempted/{attemptId}/detail")
    public ResponseEntity<AttemptReviewDetailDTO> getMyAttemptDetail(
            @PathVariable Long attemptId,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.getAttemptDetail(attemptId, authUser.userId(), authUser.role()));
    }

    @GetMapping("/lecturer/students/{studentId}/attempted/all")
    public ResponseEntity<AttemptedAssessmentListResponseDTO> getStudentAttemptedAssessments(
            @PathVariable Integer studentId,
            @RequestParam(required = false) Assessment.AssessmentType type,
            @RequestParam(required = false) Assessment.JLPTLevel level,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "10") Integer limit,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.getAttemptedAssessmentsForStudent(
            studentId,
            type,
            level,
            page,
            limit
        ));
    }

    @GetMapping("/lecturer/students/{studentId}/attempts/{attemptId}/detail")
    public ResponseEntity<AttemptReviewDetailDTO> getStudentAttemptDetail(
            @PathVariable Integer studentId,
            @PathVariable Long attemptId,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.getAttemptDetailForStudent(
            studentId,
            attemptId,
            authUser.userId(),
            authUser.role()
        ));
    }

    @GetMapping("/attempted/wrong-answer-lab")
    public ResponseEntity<Map<String, Object>> getWrongAnswerLab(
            @RequestParam(required = false, defaultValue = "20") Integer limitAttempts,
            @RequestParam(required = false, defaultValue = "8") Integer maxQuestionsPerDrill,
            @RequestParam(required = false, defaultValue = "false") Boolean includeListening,
            @RequestParam(required = false) List<String> sourceTypes,
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.getWrongAnswerLab(
            authUser.userId(),
            limitAttempts,
            maxQuestionsPerDrill,
            includeListening,
            sourceTypes
        ));
    }

    @PostMapping("/attempted/wrong-answer-lab/grade")
    public ResponseEntity<Map<String, Object>> gradeWrongAnswerLab(
            @Valid @RequestBody WrongAnswerLabGradeRequestDTO dto,
            HttpServletRequest request) {
        RequestAuthUtil.getAuthUser(request);
        return ResponseEntity.ok(attemptReviewService.gradeWrongAnswerLab(dto.getAnswers()));
    }
}