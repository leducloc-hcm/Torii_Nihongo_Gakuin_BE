package com.torii.assessment.service;

import com.torii.assessment.entity.Attempt;
import com.torii.assessment.repository.AssessmentAnswerRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AttemptRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradingService {
    
    private final AttemptRepository attemptRepository;
    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;

    @Data
    @AllArgsConstructor
    public static class GradeResult {
        private Double score;
        private Double earnedScore;
    }
    
    public GradeResult gradeAttempt(Long attemptId) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        var answers = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attemptId);

        if (answers.isEmpty()) {
            log.info("Attempt {} has no answers. Score = 0", attemptId);
            return new GradeResult(0.0, 0.0);
        }

        int correctCount = 0;
        for (var answer : answers) {
            boolean isCorrect = false;
            if (answer.getSelectedOptionId() != null) {
                var option = assessmentOptionRepository.findById(answer.getSelectedOptionId()).orElse(null);
                isCorrect = option != null && Boolean.TRUE.equals(option.getIsCorrect())
                    && option.getQuestionId().equals(answer.getQuestionId());
            }
            answer.setIsCorrect(isCorrect);
            assessmentAnswerRepository.save(answer);

            if (isCorrect) {
                correctCount++;
            }
        }

        double score = ((double) correctCount / answers.size()) * 100.0;
        
        log.info("Graded attempt {}, correct={}/{}, score={}", attemptId, correctCount, answers.size(), score);
        return new GradeResult(score, (double) correctCount);
    }
}
