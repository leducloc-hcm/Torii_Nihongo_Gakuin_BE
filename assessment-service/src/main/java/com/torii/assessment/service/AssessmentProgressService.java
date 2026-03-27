package com.torii.assessment.service;

import com.torii.assessment.dto.progress.AssessmentAnswerProgressDTO;
import com.torii.assessment.dto.progress.AssessmentProgressDTO;
import com.torii.assessment.dto.progress.AutoSaveProgressDTO;
import com.torii.assessment.dto.progress.SaveAnswerProgressDTO;
import com.torii.assessment.dto.progress.StartAssessmentProgressDTO;
import com.torii.assessment.dto.progress.SubmitAssessmentProgressDTO;
import com.torii.assessment.dto.progress.UpdateAnswerProgressDTO;
import com.torii.assessment.entity.AssessmentAnswerProgress;
import com.torii.assessment.entity.AssessmentProgress;
import com.torii.assessment.repository.AssessmentAnswerProgressRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentProgressRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentProgressService {

    private final AssessmentProgressRepository assessmentProgressRepository;
    private final AssessmentAnswerProgressRepository assessmentAnswerProgressRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;

    @Transactional
    public AssessmentProgressDTO startAssessment(StartAssessmentProgressDTO dto) {
        if (!assessmentRepository.existsById(dto.getAssessmentId())) {
            throw new RuntimeException("Assessment not found: " + dto.getAssessmentId());
        }

        AssessmentProgress progress = assessmentProgressRepository
            .findByAssessmentIdAndUserId(dto.getAssessmentId(), dto.getUserId())
            .orElseGet(AssessmentProgress::new);

        if (progress.getId() == null) {
            progress.setAssessmentId(dto.getAssessmentId());
            progress.setUserId(dto.getUserId());
            progress.setAssignmentId(dto.getAssignmentId());
            progress.setCurrentSection(0);
            progress.setCurrentQuestion(0);
            progress.setTimeSpentSec(0);
            progress.setStatus(AssessmentProgress.ProgressStatus.IN_PROGRESS);
            progress.setIsSubmitted(false);
        }

        if (dto.getRemainingSec() != null) {
            progress.setRemainingSec(dto.getRemainingSec());
        }

        return mapToDTO(assessmentProgressRepository.save(progress));
    }

    @Transactional
    public AssessmentAnswerProgressDTO saveAnswerProgress(SaveAnswerProgressDTO dto) {
        AssessmentProgress progress = assessmentProgressRepository.findById(dto.getProgressId())
            .orElseThrow(() -> new RuntimeException("Progress not found: " + dto.getProgressId()));

        if (Boolean.TRUE.equals(progress.getIsSubmitted())) {
            throw new RuntimeException("Cannot modify answers for submitted progress");
        }

        validateQuestion(dto.getQuestionId());
        validateOption(dto.getSelectedOptionId(), dto.getQuestionId());

        AssessmentAnswerProgress answerProgress = assessmentAnswerProgressRepository
            .findByProgressIdAndQuestionId(dto.getProgressId(), dto.getQuestionId())
            .orElseGet(AssessmentAnswerProgress::new);

        answerProgress.setProgressId(dto.getProgressId());
        answerProgress.setQuestionId(dto.getQuestionId());
        answerProgress.setSelectedOptionId(dto.getSelectedOptionId());
        if (dto.getTimeSpentSec() != null) {
            answerProgress.setTimeSpentSec(dto.getTimeSpentSec());
        }
        if (dto.getIsFlagged() != null) {
            answerProgress.setIsFlagged(dto.getIsFlagged());
        }

        return mapToDTO(assessmentAnswerProgressRepository.save(answerProgress));
    }

    @Transactional
    public AssessmentAnswerProgressDTO updateAnswerProgress(Long answerId, UpdateAnswerProgressDTO dto) {
        AssessmentAnswerProgress answerProgress = assessmentAnswerProgressRepository.findById(answerId)
            .orElseThrow(() -> new RuntimeException("Answer progress not found: " + answerId));

        if (dto.getSelectedOptionId() != null) {
            validateOption(dto.getSelectedOptionId(), answerProgress.getQuestionId());
            answerProgress.setSelectedOptionId(dto.getSelectedOptionId());
        }
        if (dto.getTimeSpentSec() != null) {
            answerProgress.setTimeSpentSec(dto.getTimeSpentSec());
        }
        if (dto.getIsFlagged() != null) {
            answerProgress.setIsFlagged(dto.getIsFlagged());
        }

        return mapToDTO(assessmentAnswerProgressRepository.save(answerProgress));
    }

    @Transactional
    public AssessmentProgressDTO autoSave(AutoSaveProgressDTO dto) {
        AssessmentProgress progress = assessmentProgressRepository.findById(dto.getProgressId())
            .orElseThrow(() -> new RuntimeException("Progress not found: " + dto.getProgressId()));

        if (Boolean.TRUE.equals(progress.getIsSubmitted())) {
            throw new RuntimeException("Cannot auto-save submitted progress");
        }

        if (dto.getCurrentAttemptId() != null) {
            progress.setCurrentAttemptId(dto.getCurrentAttemptId());
        }
        if (dto.getCurrentSection() != null) {
            progress.setCurrentSection(dto.getCurrentSection());
        }
        if (dto.getCurrentQuestion() != null) {
            progress.setCurrentQuestion(dto.getCurrentQuestion());
        }
        if (dto.getTimeSpentSec() != null) {
            progress.setTimeSpentSec(dto.getTimeSpentSec());
        }
        if (dto.getRemainingSec() != null) {
            progress.setRemainingSec(dto.getRemainingSec());
        }
        progress.setLastSavedAt(LocalDateTime.now());

        return mapToDTO(assessmentProgressRepository.save(progress));
    }

    @Transactional
    public AssessmentProgressDTO submitAssessment(SubmitAssessmentProgressDTO dto) {
        AssessmentProgress progress = assessmentProgressRepository.findById(dto.getProgressId())
            .orElseThrow(() -> new RuntimeException("Progress not found: " + dto.getProgressId()));

        if (Boolean.TRUE.equals(progress.getIsSubmitted())) {
            throw new RuntimeException("Assessment already submitted");
        }

        progress.setIsSubmitted(true);
        progress.setStatus(AssessmentProgress.ProgressStatus.SUBMITTED);
        progress.setCompletedAt(LocalDateTime.now());
        progress.setLastSavedAt(LocalDateTime.now());

        return mapToDTO(assessmentProgressRepository.save(progress));
    }

    public AssessmentProgressDTO getProgressById(Long progressId) {
        AssessmentProgress progress = assessmentProgressRepository.findById(progressId)
            .orElseThrow(() -> new RuntimeException("Progress not found: " + progressId));
        return mapToDTO(progress);
    }

    public List<AssessmentProgressDTO> getUserProgresses(Integer userId) {
        return assessmentProgressRepository.findByUserIdOrderByStartedAtDesc(userId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public AssessmentProgressDTO getUserProgressByAssessment(Long assessmentId, Integer userId) {
        AssessmentProgress progress = assessmentProgressRepository.findByAssessmentIdAndUserId(assessmentId, userId)
            .orElseThrow(() -> new RuntimeException("Progress not found for user " + userId + " and assessment " + assessmentId));
        return mapToDTO(progress);
    }

    public List<AssessmentAnswerProgressDTO> getAnswersByProgress(Long progressId) {
        if (!assessmentProgressRepository.existsById(progressId)) {
            throw new RuntimeException("Progress not found: " + progressId);
        }
        return assessmentAnswerProgressRepository.findByProgressIdOrderByLastUpdatedAtDesc(progressId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public void deleteProgress(Long progressId) {
        if (!assessmentProgressRepository.existsById(progressId)) {
            throw new RuntimeException("Progress not found: " + progressId);
        }
        assessmentAnswerProgressRepository.deleteByProgressId(progressId);
        assessmentProgressRepository.deleteById(progressId);
    }

    private void validateQuestion(Long questionId) {
        if (!assessmentQuestionRepository.existsById(questionId)) {
            throw new RuntimeException("Assessment question not found: " + questionId);
        }
    }

    private void validateOption(Long optionId, Long questionId) {
        if (optionId == null) {
            return;
        }
        var option = assessmentOptionRepository.findById(optionId)
            .orElseThrow(() -> new RuntimeException("Option not found: " + optionId));

        if (!option.getQuestionId().equals(questionId)) {
            throw new RuntimeException("Option " + optionId + " does not belong to question " + questionId);
        }
    }

    private AssessmentProgressDTO mapToDTO(AssessmentProgress progress) {
        AssessmentProgressDTO dto = new AssessmentProgressDTO();
        dto.setId(progress.getId());
        dto.setAssessmentId(progress.getAssessmentId());
        dto.setUserId(progress.getUserId());
        dto.setAssignmentId(progress.getAssignmentId());
        dto.setCurrentAttemptId(progress.getCurrentAttemptId());
        dto.setCurrentSection(progress.getCurrentSection());
        dto.setCurrentQuestion(progress.getCurrentQuestion());
        dto.setTimeSpentSec(progress.getTimeSpentSec());
        dto.setRemainingSec(progress.getRemainingSec());
        dto.setIsSubmitted(progress.getIsSubmitted());
        dto.setStatus(progress.getStatus());
        dto.setCompletedAt(progress.getCompletedAt());
        dto.setStartedAt(progress.getStartedAt());
        dto.setLastSavedAt(progress.getLastSavedAt());
        return dto;
    }

    private AssessmentAnswerProgressDTO mapToDTO(AssessmentAnswerProgress answerProgress) {
        AssessmentAnswerProgressDTO dto = new AssessmentAnswerProgressDTO();
        dto.setId(answerProgress.getId());
        dto.setProgressId(answerProgress.getProgressId());
        dto.setQuestionId(answerProgress.getQuestionId());
        dto.setSelectedOptionId(answerProgress.getSelectedOptionId());
        dto.setTimeSpentSec(answerProgress.getTimeSpentSec());
        dto.setIsFlagged(answerProgress.getIsFlagged());
        dto.setLastUpdatedAt(answerProgress.getLastUpdatedAt());
        return dto;
    }
}
