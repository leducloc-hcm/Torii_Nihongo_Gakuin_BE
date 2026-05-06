package com.torii.assessment.service;

import com.torii.assessment.dto.progress.AssessmentAnswerProgressDTO;
import com.torii.assessment.dto.assessment.AssessmentDTO;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentProgressService {

    private final AssessmentProgressRepository assessmentProgressRepository;
    private final AssessmentAnswerProgressRepository assessmentAnswerProgressRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentService assessmentService;

    @Transactional
    public AssessmentProgressDTO startAssessment(StartAssessmentProgressDTO dto, Integer requesterUserId) {
        if (!assessmentRepository.existsById(dto.getAssessmentId())) {
            throw new RuntimeException("Assessment not found: " + dto.getAssessmentId());
        }

        AssessmentProgress progress = assessmentProgressRepository
            .findByAssessmentIdAndUserId(dto.getAssessmentId(), requesterUserId)
            .orElseGet(AssessmentProgress::new);

        if (progress.getId() == null) {
            progress.setAssessmentId(dto.getAssessmentId());
            progress.setUserId(requesterUserId);
            progress.setAssignmentId(dto.getAssignmentId());
            progress.setCurrentSection(0);
            progress.setCurrentQuestion(0);
            progress.setTimeSpentSec(0);
            progress.setStatus(AssessmentProgress.ProgressStatus.IN_PROGRESS);
            progress.setIsSubmitted(false);
        } else if (Boolean.TRUE.equals(progress.getIsSubmitted())
            || AssessmentProgress.ProgressStatus.SUBMITTED.equals(progress.getStatus())
            || AssessmentProgress.ProgressStatus.EXPIRED.equals(progress.getStatus())) {
            // Only one progress row exists per assessment/user; reset it to start a new attempt cycle.
            assessmentAnswerProgressRepository.deleteByProgressId(progress.getId());
            progress.setAssignmentId(dto.getAssignmentId());
            progress.setCurrentAttemptId(null);
            progress.setCurrentSection(0);
            progress.setCurrentQuestion(0);
            progress.setTimeSpentSec(0);
            progress.setRemainingSec(null);
            progress.setIsSubmitted(false);
            progress.setStatus(AssessmentProgress.ProgressStatus.IN_PROGRESS);
            progress.setCompletedAt(null);
            progress.setStartedAt(LocalDateTime.now());
            progress.setLastSavedAt(LocalDateTime.now());
        }

        if (dto.getRemainingSec() != null) {
            progress.setRemainingSec(dto.getRemainingSec());
        }

        return mapToDTO(assessmentProgressRepository.save(progress));
    }

    @Transactional
    public AssessmentAnswerProgressDTO saveAnswerProgress(SaveAnswerProgressDTO dto, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = getProgressForAccess(dto.getProgressId(), requesterUserId, requesterRole);

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

        try {
            return mapToDTO(assessmentAnswerProgressRepository.save(answerProgress));
        } catch (DataIntegrityViolationException ex) {
            // Handle concurrent requests inserting the same (progress_id, question_id).
            AssessmentAnswerProgress existing = assessmentAnswerProgressRepository
                .findByProgressIdAndQuestionId(dto.getProgressId(), dto.getQuestionId())
                .orElseThrow(() -> ex);

            existing.setSelectedOptionId(dto.getSelectedOptionId());
            if (dto.getTimeSpentSec() != null) {
                existing.setTimeSpentSec(dto.getTimeSpentSec());
            }
            if (dto.getIsFlagged() != null) {
                existing.setIsFlagged(dto.getIsFlagged());
            }

            return mapToDTO(assessmentAnswerProgressRepository.save(existing));
        }
    }

    @Transactional
    public AssessmentAnswerProgressDTO updateAnswerProgress(Long answerId, UpdateAnswerProgressDTO dto, Integer requesterUserId, String requesterRole) {
        AssessmentAnswerProgress answerProgress = assessmentAnswerProgressRepository.findById(answerId)
            .orElseThrow(() -> new RuntimeException("Answer progress not found: " + answerId));

        getProgressForAccess(answerProgress.getProgressId(), requesterUserId, requesterRole);

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
    public AssessmentProgressDTO autoSave(AutoSaveProgressDTO dto, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = getProgressForAccess(dto.getProgressId(), requesterUserId, requesterRole);

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
    public AssessmentProgressDTO submitAssessment(SubmitAssessmentProgressDTO dto, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = getProgressForAccess(dto.getProgressId(), requesterUserId, requesterRole);

        if (Boolean.TRUE.equals(progress.getIsSubmitted())) {
            throw new RuntimeException("Assessment already submitted");
        }

        progress.setIsSubmitted(true);
        progress.setStatus(AssessmentProgress.ProgressStatus.SUBMITTED);
        progress.setCompletedAt(LocalDateTime.now());
        progress.setLastSavedAt(LocalDateTime.now());

        return mapToDTO(assessmentProgressRepository.save(progress));
    }

    public AssessmentProgressDTO getProgressById(Long progressId, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = getProgressForAccess(progressId, requesterUserId, requesterRole);
        return mapToDTO(progress);
    }

    public AssessmentDTO getProgressDetailById(Long progressId, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = getProgressForAccess(progressId, requesterUserId, requesterRole);
        AssessmentDTO assessmentDTO = assessmentService.getAssessmentById(progress.getAssessmentId());

        Map<Long, Long> selectedOptionByQuestionId = assessmentAnswerProgressRepository
            .findByProgressIdOrderByLastUpdatedAtDesc(progressId)
            .stream()
            .filter(answer -> answer.getSelectedOptionId() != null)
            .collect(Collectors.toMap(
                AssessmentAnswerProgress::getQuestionId,
                AssessmentAnswerProgress::getSelectedOptionId,
                (first, second) -> first
            ));

        if (assessmentDTO.getSections() == null) {
            return assessmentDTO;
        }

        assessmentDTO.getSections().forEach(section -> {
            if (section.getItems() == null) {
                return;
            }

            section.getItems().forEach(item -> {
                if (item.getQuestions() == null) {
                    return;
                }

                item.getQuestions().forEach(question ->
                    question.setSelectedOptionId(selectedOptionByQuestionId.get(question.getId()))
                );
            });
        });

        return assessmentDTO;
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

    public List<AssessmentAnswerProgressDTO> getAnswersByProgress(Long progressId, Integer requesterUserId, String requesterRole) {
        getProgressForAccess(progressId, requesterUserId, requesterRole);
        return assessmentAnswerProgressRepository.findByProgressIdOrderByLastUpdatedAtDesc(progressId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public void deleteProgress(Long progressId, Integer requesterUserId, String requesterRole) {
        getProgressForAccess(progressId, requesterUserId, requesterRole);
        assessmentAnswerProgressRepository.deleteByProgressId(progressId);
        assessmentProgressRepository.deleteById(progressId);
    }

    private AssessmentProgress getProgressForAccess(Long progressId, Integer requesterUserId, String requesterRole) {
        AssessmentProgress progress = assessmentProgressRepository.findById(progressId)
            .orElseThrow(() -> new RuntimeException("Progress not found: " + progressId));

        boolean privileged = "STAFF".equalsIgnoreCase(requesterRole)
            || "LECTURER".equalsIgnoreCase(requesterRole)
            || "ADMIN".equalsIgnoreCase(requesterRole);

        if (!privileged && !progress.getUserId().equals(requesterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "CUSTOMER can only access their own progress");
        }

        return progress;
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
