package com.torii.assessment.service;

import com.torii.assessment.dto.answer.AnswerDTO;
import com.torii.assessment.dto.answer.AssessmentAnswerSummaryDTO;
import com.torii.assessment.dto.answer.CreateAssessmentAnswerDTO;
import com.torii.assessment.dto.answer.UpdateAssessmentAnswerDTO;
import com.torii.assessment.entity.AssessmentAnswer;
import com.torii.assessment.repository.AssessmentAnswerRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AttemptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentAnswerService {

    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AttemptRepository attemptRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;

    @Transactional
    public AnswerDTO createAnswer(CreateAssessmentAnswerDTO dto) {
        validateAttempt(dto.getAttemptId());
        validateQuestion(dto.getQuestionId());
        validateOption(dto.getSelectedOptionId(), dto.getQuestionId());

        if (assessmentAnswerRepository.existsByAttemptIdAndQuestionId(dto.getAttemptId(), dto.getQuestionId())) {
            throw new RuntimeException("Answer already exists for attempt " + dto.getAttemptId() + " and question " + dto.getQuestionId());
        }

        AssessmentAnswer answer = new AssessmentAnswer();
        answer.setAttemptId(dto.getAttemptId());
        answer.setQuestionId(dto.getQuestionId());
        answer.setSelectedOptionId(dto.getSelectedOptionId());
        answer.setTimeSpentSec(dto.getTimeSpentSec());
        answer.setExplanation(dto.getExplanation());

        return mapToDTO(assessmentAnswerRepository.save(answer));
    }

    @Transactional
    public AnswerDTO createOrUpdateAnswer(Long attemptId, Long questionId, Long selectedOptionId, Integer timeSpentSec) {
        validateAttempt(attemptId);
        validateQuestion(questionId);
        validateOption(selectedOptionId, questionId);

        AssessmentAnswer answer = assessmentAnswerRepository.findByAttemptIdAndQuestionId(attemptId, questionId)
            .orElseGet(AssessmentAnswer::new);

        answer.setAttemptId(attemptId);
        answer.setQuestionId(questionId);
        answer.setSelectedOptionId(selectedOptionId);
        answer.setTimeSpentSec(timeSpentSec);

        return mapToDTO(assessmentAnswerRepository.save(answer));
    }

    public AnswerDTO getAnswerById(Long id) {
        AssessmentAnswer answer = assessmentAnswerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Answer not found: " + id));
        return mapToDTO(answer);
    }

    public List<AnswerDTO> getAttemptAnswers(Long attemptId) {
        validateAttempt(attemptId);
        return assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attemptId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public AnswerDTO updateAnswer(Long id, UpdateAssessmentAnswerDTO dto) {
        AssessmentAnswer answer = assessmentAnswerRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Answer not found: " + id));

        if (dto.getSelectedOptionId() != null) {
            validateOption(dto.getSelectedOptionId(), answer.getQuestionId());
            answer.setSelectedOptionId(dto.getSelectedOptionId());
        }
        if (dto.getIsCorrect() != null) {
            answer.setIsCorrect(dto.getIsCorrect());
        }
        if (dto.getTimeSpentSec() != null) {
            answer.setTimeSpentSec(dto.getTimeSpentSec());
        }
        if (dto.getExplanation() != null) {
            answer.setExplanation(dto.getExplanation());
        }

        return mapToDTO(assessmentAnswerRepository.save(answer));
    }

    @Transactional
    public void deleteAnswer(Long id) {
        if (!assessmentAnswerRepository.existsById(id)) {
            throw new RuntimeException("Answer not found: " + id);
        }
        assessmentAnswerRepository.deleteById(id);
    }

    @Transactional
    public long deleteAttemptAnswers(Long attemptId) {
        validateAttempt(attemptId);
        return assessmentAnswerRepository.deleteByAttemptId(attemptId);
    }

    public AssessmentAnswerSummaryDTO getAttemptSummary(Long attemptId) {
        validateAttempt(attemptId);

        long total = assessmentAnswerRepository.countByAttemptId(attemptId);
        long answered = assessmentAnswerRepository.countByAttemptIdAndSelectedOptionIdIsNotNull(attemptId);
        long correct = assessmentAnswerRepository.countByAttemptIdAndIsCorrectTrue(attemptId);
        long wrong = answered - correct;
        long skipped = total - answered;

        double completionPercentage = total == 0 ? 0 : ((double) answered / total) * 100;
        double accuracy = answered == 0 ? 0 : ((double) correct / answered) * 100;

        return AssessmentAnswerSummaryDTO.builder()
            .attemptId(attemptId)
            .totalQuestions(total)
            .answeredQuestions(answered)
            .correctAnswers(correct)
            .wrongAnswers(wrong)
            .skippedQuestions(skipped)
            .completionPercentage(round2(completionPercentage))
            .accuracy(round2(accuracy))
            .build();
    }

    public AssessmentAnswerSummaryDTO getAttemptProgress(Long attemptId) {
        return getAttemptSummary(attemptId);
    }

    private void validateAttempt(Long attemptId) {
        if (!attemptRepository.existsById(attemptId)) {
            throw new RuntimeException("Attempt not found: " + attemptId);
        }
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

    private AnswerDTO mapToDTO(AssessmentAnswer answer) {
        AnswerDTO dto = new AnswerDTO();
        dto.setId(answer.getId());
        dto.setQuestionId(answer.getQuestionId());
        dto.setSelectedOptionId(answer.getSelectedOptionId());
        dto.setIsCorrect(answer.getIsCorrect());
        dto.setTimeSpentSec(answer.getTimeSpentSec());
        dto.setExplanation(answer.getExplanation());
        return dto;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
