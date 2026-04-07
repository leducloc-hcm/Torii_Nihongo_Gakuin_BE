package com.torii.assessment.service;

import com.torii.assessment.dto.answer.AnswerDTO;
import com.torii.assessment.dto.attempt.AttemptDTO;
import com.torii.assessment.dto.attempt.CreateAttemptDTO;
import com.torii.assessment.dto.attempt.SubmitAnswerDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.entity.AssessmentAnswer;
import com.torii.assessment.entity.Attempt;
import com.torii.assessment.messaging.EventPublisher;
import com.torii.assessment.repository.AssessmentAnswerRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttemptService {
    
    private final AttemptRepository attemptRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AssessmentAnswerService assessmentAnswerService;
    private final GradingService gradingService;
    private final EventPublisher eventPublisher;
    
    @Transactional
    public AttemptDTO createAttempt(CreateAttemptDTO dto) {
        Assessment assessment = assessmentRepository.findById(dto.getAssessmentId())
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + dto.getAssessmentId()));

        Attempt attempt = new Attempt();
        attempt.setAssessmentId(dto.getAssessmentId());
        attempt.setUserId(dto.getUserId());
        attempt.setProgressId(dto.getProgressId());
        attempt.setStartedAt(LocalDateTime.now());
        attempt.setAttemptNo((int) attemptRepository.countByAssessmentIdAndUserId(dto.getAssessmentId(), dto.getUserId()) + 1);
        attempt.setStatus(Attempt.AttemptStatus.IN_PROGRESS);
        
        Attempt saved = attemptRepository.save(attempt);
        log.info("Created attempt: {} for user: {}", saved.getId(), saved.getUserId());
        
        return mapToDTO(saved);
    }
    
    public AttemptDTO getAttemptById(Long id, Integer requesterUserId, String requesterRole) {
        Attempt attempt = getAttemptForAccess(id, requesterUserId, requesterRole);
        return mapToDTO(attempt);
    }
    
    public List<AttemptDTO> getUserAttempts(Integer userId) {
        List<Attempt> attempts = attemptRepository.findByUserId(userId);
        return attempts.stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public void submitAnswer(Long attemptId, SubmitAnswerDTO dto, Integer requesterUserId, String requesterRole) {
        Attempt attempt = getAttemptForAccess(attemptId, requesterUserId, requesterRole);

        if (attempt.getStatus() == Attempt.AttemptStatus.SUBMITTED) {
            throw new RuntimeException("Attempt already submitted: " + attemptId);
        }

        assessmentAnswerService.createOrUpdateAnswer(
            attemptId,
            dto.getQuestionId(),
            dto.getSelectedOptionId(),
            dto.getTimeSpentSec()
        );
        
        log.info("Submitted answer for attempt: {}, question: {}", attemptId, dto.getQuestionId());
    }
    
    @Transactional
    public AttemptDTO submitAttempt(Long attemptId, Integer requesterUserId, String requesterRole) {
        Attempt attempt = getAttemptForAccess(attemptId, requesterUserId, requesterRole);

        if (attempt.getStatus() == Attempt.AttemptStatus.SUBMITTED) {
            throw new RuntimeException("Attempt already submitted: " + attemptId);
        }
        
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setStatus(Attempt.AttemptStatus.SUBMITTED);
        
        // Grade the attempt
        GradingService.GradeResult gradeResult = gradingService.gradeAttempt(attemptId);
        Double score = gradeResult.getScore();
        attempt.setScore(score);
        attempt.setEarnedScore(gradeResult.getEarnedScore());
        
        Attempt saved = attemptRepository.save(attempt);
        
        // Publish events
        eventPublisher.publishAttemptSubmitted(saved.getId(), saved.getUserId().longValue(), saved.getAssessmentId());
        eventPublisher.publishAttemptGraded(saved.getId(), saved.getUserId().longValue(), saved.getAssessmentId(), score);
        
        log.info("Submitted and graded attempt: {}, score: {}", saved.getId(), score);
        
        return mapToDTO(saved);
    }
    
    public AttemptDTO getAttemptResults(Long id, Integer requesterUserId, String requesterRole) {
        Attempt attempt = getAttemptForAccess(id, requesterUserId, requesterRole);
        return mapToDTO(attempt);
    }

    private Attempt getAttemptForAccess(Long attemptId, Integer requesterUserId, String requesterRole) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        boolean privileged = "STAFF".equalsIgnoreCase(requesterRole)
            || "LECTURER".equalsIgnoreCase(requesterRole)
            || "ADMIN".equalsIgnoreCase(requesterRole);

        if (!privileged && !attempt.getUserId().equals(requesterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "CUSTOMER can only access their own attempts");
        }

        return attempt;
    }
    
    private AttemptDTO mapToDTO(Attempt attempt) {
        AttemptDTO dto = new AttemptDTO();
        dto.setId(attempt.getId());
        dto.setAssessmentId(attempt.getAssessmentId());
        dto.setUserId(attempt.getUserId());
        dto.setProgressId(attempt.getProgressId());
        dto.setAttemptNo(attempt.getAttemptNo());
        dto.setStatus(attempt.getStatus() != null ? attempt.getStatus().name() : null);
        dto.setStartedAt(attempt.getStartedAt());
        dto.setSubmittedAt(attempt.getSubmittedAt());
        dto.setScore(attempt.getScore());
        dto.setEarnedScore(attempt.getEarnedScore());
        List<AssessmentAnswer> answers = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attempt.getId());
        dto.setAnswers(answers.stream().map(answer -> {
            var answerDto = new AnswerDTO();
            answerDto.setId(answer.getId());
            answerDto.setQuestionId(answer.getQuestionId());
            answerDto.setSelectedOptionId(answer.getSelectedOptionId());
            answerDto.setIsCorrect(answer.getIsCorrect());
            answerDto.setTimeSpentSec(answer.getTimeSpentSec());
            answerDto.setExplanation(answer.getExplanation());
            return answerDto;
        }).collect(Collectors.toList()));
        return dto;
    }
}
