package com.torii.assessment.controller;

import com.torii.assessment.dto.attempt.AttemptDTO;
import com.torii.assessment.dto.attempt.CreateAttemptDTO;
import com.torii.assessment.dto.attempt.SubmitAnswerDTO;
import com.torii.assessment.service.AttemptService;
import com.torii.assessment.util.RequestAuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/assessment/attempts")
@RequiredArgsConstructor
public class AttemptController {
    
    private final AttemptService attemptService;
    
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
            HttpServletRequest request) {
        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.getAuthUser(request);
        AttemptDTO attempt = attemptService.submitAttempt(id, authUser.userId(), authUser.role());
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
}
