package com.torii.assessment.controller;

import com.torii.assessment.dto.AssessmentDTO;
import com.torii.assessment.dto.CreateAssessmentDTO;
import com.torii.assessment.dto.UpdateAssessmentDTO;
import com.torii.assessment.service.AssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/assessment")
@RequiredArgsConstructor
public class AssessmentController {
    
    private final AssessmentService assessmentService;


    @PostMapping
    public ResponseEntity<AssessmentDTO> createAssessment(@Valid @RequestBody CreateAssessmentDTO dto) {
        AssessmentDTO assessment = assessmentService.createAssessment(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(assessment);
    }
    
    @GetMapping
    public ResponseEntity<List<AssessmentDTO>> getAllAssessments(
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String type) {
        List<AssessmentDTO> assessments = assessmentService.getAllAssessments(level, type);
        return ResponseEntity.ok(assessments);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<AssessmentDTO> getAssessmentById(@PathVariable Long id) {
        AssessmentDTO assessment = assessmentService.getAssessmentById(id);
        return ResponseEntity.ok(assessment);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<AssessmentDTO> updateAssessment(
            @PathVariable Long id,
            @RequestBody UpdateAssessmentDTO dto) {
        AssessmentDTO assessment = assessmentService.updateAssessment(id, dto);
        return ResponseEntity.ok(assessment);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAssessment(@PathVariable Long id) {
        assessmentService.deleteAssessment(id);
        return ResponseEntity.noContent().build();
    }
}
