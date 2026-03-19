package com.torii.assessment.service;

import com.torii.assessment.dto.AttemptDTO;
import com.torii.assessment.dto.CreateAttemptDTO;
import com.torii.assessment.dto.SubmitAnswerDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.entity.Attempt;
import com.torii.assessment.messaging.EventPublisher;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttemptService {
    
    private final AttemptRepository attemptRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserCourseAccessService userCourseAccessService;
    private final GradingService gradingService;
    private final EventPublisher eventPublisher;
    
    @Transactional
    public AttemptDTO createAttempt(CreateAttemptDTO dto) {
        Assessment assessment = assessmentRepository.findById(dto.getAssessmentId())
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + dto.getAssessmentId()));

        // Gate attempt creation based on visibility + course enrollment access
        if (!"PUBLIC".equalsIgnoreCase(assessment.getVisibility())) {
            Integer courseId = assessment.getCourseId();
            if (courseId == null) {
                throw new RuntimeException("Assessment is not public and has no courseId configured for gating");
            }
            if (!userCourseAccessService.hasAccess(dto.getUserId(), courseId)) {
                throw new RuntimeException("User is not eligible for this assessment (course access required)");
            }
        }

        Attempt attempt = new Attempt();
        attempt.setAssessmentId(dto.getAssessmentId());
        attempt.setUserId(dto.getUserId());
        attempt.setStartedAt(LocalDateTime.now());
        
        Attempt saved = attemptRepository.save(attempt);
        log.info("Created attempt: {} for user: {}", saved.getId(), saved.getUserId());
        
        return mapToDTO(saved);
    }
    
    public AttemptDTO getAttemptById(Long id) {
        Attempt attempt = attemptRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + id));
        return mapToDTO(attempt);
    }
    
    public List<AttemptDTO> getUserAttempts(Integer userId) {
        List<Attempt> attempts = attemptRepository.findByUserId(userId);
        return attempts.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void submitAnswer(Long attemptId, SubmitAnswerDTO dto) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));
        
        // TODO: Save answer to database
        log.info("Submitted answer for attempt: {}, question: {}", attemptId, dto.getQuestionId());
    }
    
    @Transactional
    public AttemptDTO submitAttempt(Long attemptId) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));
        
        attempt.setSubmittedAt(LocalDateTime.now());
        
        // Grade the attempt
        Double score = gradingService.gradeAttempt(attemptId);
        attempt.setScore(score);
        
        Attempt saved = attemptRepository.save(attempt);
        
        // Publish events
        eventPublisher.publishAttemptSubmitted(saved.getId(), saved.getUserId().longValue(), saved.getAssessmentId());
        eventPublisher.publishAttemptGraded(saved.getId(), saved.getUserId().longValue(), saved.getAssessmentId(), score);
        
        log.info("Submitted and graded attempt: {}, score: {}", saved.getId(), score);
        
        return mapToDTO(saved);
    }
    
    public AttemptDTO getAttemptResults(Long id) {
        Attempt attempt = attemptRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + id));
        return mapToDTO(attempt);
    }
    
    private AttemptDTO mapToDTO(Attempt attempt) {
        AttemptDTO dto = new AttemptDTO();
        dto.setId(attempt.getId());
        dto.setAssessmentId(attempt.getAssessmentId());
        dto.setUserId(attempt.getUserId());
        dto.setStartedAt(attempt.getStartedAt());
        dto.setSubmittedAt(attempt.getSubmittedAt());
        dto.setScore(attempt.getScore());
        dto.setLevelSuggestion(attempt.getLevelSuggestion());
        dto.setEarnedScore(attempt.getEarnedScore());
        // TODO: Map answers
        return dto;
    }
}
