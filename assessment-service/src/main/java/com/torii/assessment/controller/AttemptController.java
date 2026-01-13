package com.torii.assessment.controller;

import com.torii.assessment.dto.AttemptDTO;
import com.torii.assessment.dto.CreateAttemptDTO;
import com.torii.assessment.dto.SubmitAnswerDTO;
import com.torii.assessment.service.AttemptService;
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
    public ResponseEntity<AttemptDTO> createAttempt(@Valid @RequestBody CreateAttemptDTO dto) {
        AttemptDTO attempt = attemptService.createAttempt(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(attempt);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<AttemptDTO> getAttemptById(@PathVariable Long id) {
        AttemptDTO attempt = attemptService.getAttemptById(id);
        return ResponseEntity.ok(attempt);
    }
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AttemptDTO>> getUserAttempts(@PathVariable Integer userId) {
        List<AttemptDTO> attempts = attemptService.getUserAttempts(userId);
        return ResponseEntity.ok(attempts);
    }
    
    @PostMapping("/{id}/answers")
    public ResponseEntity<Void> submitAnswer(
            @PathVariable Long id,
            @Valid @RequestBody SubmitAnswerDTO dto) {
        attemptService.submitAnswer(id, dto);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{id}/submit")
    public ResponseEntity<AttemptDTO> submitAttempt(@PathVariable Long id) {
        AttemptDTO attempt = attemptService.submitAttempt(id);
        return ResponseEntity.ok(attempt);
    }
    
    @GetMapping("/{id}/results")
    public ResponseEntity<AttemptDTO> getAttemptResults(@PathVariable Long id) {
        AttemptDTO attempt = attemptService.getAttemptResults(id);
        return ResponseEntity.ok(attempt);
    }
}
