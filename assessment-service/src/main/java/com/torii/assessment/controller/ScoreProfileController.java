package com.torii.assessment.controller;

import com.torii.assessment.dto.scoreprofile.*;
import com.torii.assessment.service.ScoreProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/score-profiles")
@RequiredArgsConstructor
public class ScoreProfileController {
    
    private final ScoreProfileService scoreProfileService;
    
    @PostMapping
    public ResponseEntity<ScoreProfileResponseDTO> create(@Valid @RequestBody CreateScoreProfileDTO dto) {
        ScoreProfileResponseDTO response = scoreProfileService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping
    public ResponseEntity<ScoreProfileListResponseDTO> findMany(
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer limit,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String name,
            @RequestParam(required = false, defaultValue = "createdAt") String sortBy,
            @RequestParam(required = false, defaultValue = "desc") String sortOrder) {
        
        ScoreProfileQueryDTO query = new ScoreProfileQueryDTO();
        query.setPage(page);
        query.setLimit(limit);
        query.setLevel(level);
        query.setName(name);
        query.setSortBy(sortBy);
        query.setSortOrder(sortOrder);
        
        ScoreProfileListResponseDTO response = scoreProfileService.findMany(query);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ScoreProfileResponseDTO> findById(@PathVariable Long id) {
        ScoreProfileResponseDTO response = scoreProfileService.findById(id);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ScoreProfileResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateScoreProfileDTO dto) {
        ScoreProfileResponseDTO response = scoreProfileService.update(id, dto);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        scoreProfileService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Score profile deleted successfully"));
    }
}
