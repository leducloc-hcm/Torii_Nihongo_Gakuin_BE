package com.torii.assessment.service;

import com.torii.assessment.dto.AssessmentDTO;
import com.torii.assessment.dto.CreateAssessmentDTO;
import com.torii.assessment.dto.UpdateAssessmentDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssessmentService {
    
    private final AssessmentRepository assessmentRepository;
    
    @Transactional
    public AssessmentDTO createAssessment(CreateAssessmentDTO dto) {
        Assessment assessment = new Assessment();
        assessment.setTitle(dto.getTitle());
        assessment.setLevel(dto.getLevel());
        assessment.setType(dto.getType());
        assessment.setVisibility(dto.getVisibility());
        assessment.setCreatedBy(dto.getCreatedBy());
        assessment.setScoreProfileId(dto.getScoreProfileId());
        
        Assessment saved = assessmentRepository.save(assessment);
        log.info("Created assessment: {}", saved.getId());
        
        return mapToDTO(saved);
    }
    
    public List<AssessmentDTO> getAllAssessments(String level, String type) {
        List<Assessment> assessments;
        
        if (level != null && type != null) {
            assessments = assessmentRepository.findByLevelAndType(level, type);
        } else if (level != null) {
            assessments = assessmentRepository.findByLevel(level);
        } else if (type != null) {
            assessments = assessmentRepository.findByType(type);
        } else {
            assessments = assessmentRepository.findAll();
        }
        
        return assessments.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public AssessmentDTO getAssessmentById(Long id) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + id));
        return mapToDTO(assessment);
    }
    
    @Transactional
    public AssessmentDTO updateAssessment(Long id, UpdateAssessmentDTO dto) {
        Assessment assessment = assessmentRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + id));
        
        // Only update non-null fields
        if (dto.getTitle() != null) {
            assessment.setTitle(dto.getTitle());
        }
        if (dto.getLevel() != null) {
            assessment.setLevel(dto.getLevel());
        }
        if (dto.getType() != null) {
            assessment.setType(dto.getType());
        }
        if (dto.getVisibility() != null) {
            assessment.setVisibility(dto.getVisibility());
        }
        if (dto.getScoreProfileId() != null) {
            assessment.setScoreProfileId(dto.getScoreProfileId());
        }
        
        Assessment updated = assessmentRepository.save(assessment);
        log.info("Updated assessment: {}", updated.getId());
        
        return mapToDTO(updated);
    }
    
    @Transactional
    public void deleteAssessment(Long id) {
        assessmentRepository.deleteById(id);
        log.info("Deleted assessment: {}", id);
    }
    
    private AssessmentDTO mapToDTO(Assessment assessment) {
        AssessmentDTO dto = new AssessmentDTO();
        dto.setId(assessment.getId());
        dto.setTitle(assessment.getTitle());
        dto.setLevel(assessment.getLevel());
        dto.setType(assessment.getType());
        dto.setVisibility(assessment.getVisibility());
        dto.setCreatedBy(assessment.getCreatedBy());
        dto.setCreatedAt(assessment.getCreatedAt());
        dto.setScoreProfileId(assessment.getScoreProfileId());
        dto.setVersion(assessment.getVersion());
        // TODO: Map sections
        return dto;
    }
}
