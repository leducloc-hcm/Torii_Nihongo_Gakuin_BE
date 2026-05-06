package com.torii.assessment.service;

import org.springframework.stereotype.Service;

import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.ScoreProfile;
import com.torii.assessment.entity.ScoreProfileSection;
import com.torii.assessment.entity.Attempt;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentAnswerRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.ScoreProfileSectionRepository;
import com.torii.assessment.repository.AttemptRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradingService {
    
    private final AttemptRepository attemptRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final ScoreProfileSectionRepository scoreProfileSectionRepository;

    @Data
    @AllArgsConstructor
    public static class GradeResult {
        private Double score;
        private Double earnedScore;
        private String levelSuggestion;
        private Integer totalQuestions;
    }
    
    public GradeResult gradeAttempt(Long attemptId) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        var answers = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attemptId);

        if (answers.isEmpty()) {
            log.info("Attempt {} has no answers. Score = 0", attemptId);
            return new GradeResult(0.0, 0.0, null, 0);
        }

        Map<Long, AssessmentQuestion> questionById = assessmentQuestionRepository
            .findAllById(answers.stream().map(a -> a.getQuestionId()).toList())
            .stream()
            .collect(java.util.stream.Collectors.toMap(AssessmentQuestion::getId, q -> q));

        Map<String, Integer> totalByType = new HashMap<>();
        Map<String, Integer> correctByType = new HashMap<>();

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

            AssessmentQuestion question = questionById.get(answer.getQuestionId());
            if (question != null && question.getType() != null) {
                String sectionType = mapQuestionTypeToSectionType(question.getType().name());
                totalByType.merge(sectionType, 1, Integer::sum);
                if (isCorrect) {
                    correctByType.merge(sectionType, 1, Integer::sum);
                }
            }
        }

        var assessment = assessmentRepository.findById(attempt.getAssessmentId()).orElse(null);
        ScoreProfile scoreProfile = assessment != null ? assessment.getScoreProfile() : null;

        if (scoreProfile == null) {
            double score = ((double) correctCount / answers.size()) * 100.0;
            log.info("Graded attempt {} without score profile, correct={}/{}, score={}", attemptId, correctCount, answers.size(), score);
            return new GradeResult(score, (double) correctCount, null, answers.size());
        }

        List<ScoreProfileSection> sections = scoreProfileSectionRepository.findByProfileId(scoreProfile.getId());
        if (sections.isEmpty()) {
            double score = ((double) correctCount / answers.size()) * 100.0;
            log.info("Graded attempt {} with empty profile sections, correct={}/{}, score={}", attemptId, correctCount, answers.size(), score);
            return new GradeResult(score, (double) correctCount, null, answers.size());
        }

        double earnedScore = 0.0;
        double fallbackMaxTotal = sections.stream()
            .map(ScoreProfileSection::getMaxScore)
            .filter(v -> v != null)
            .mapToDouble(Integer::doubleValue)
            .sum();

        boolean sectionPass = true;
        Set<String> sectionTypes = sections.stream()
            .map(ScoreProfileSection::getType)
            .filter(t -> t != null && !t.isBlank())
            .map(t -> t.toUpperCase(Locale.ROOT))
            .collect(java.util.stream.Collectors.toSet());

        for (ScoreProfileSection section : sections) {
            String sectionType = section.getType() != null ? section.getType().toUpperCase(Locale.ROOT) : null;
            if (sectionType == null) {
                continue;
            }

            int total = totalByType.getOrDefault(sectionType, 0);
            int correct = correctByType.getOrDefault(sectionType, 0);
            double ratio = total > 0 ? (double) correct / total : 0.0;

            double sectionMax = section.getMaxScore() != null ? section.getMaxScore() : 0;
            double sectionEarned = ratio * sectionMax;
            earnedScore += sectionEarned;

            if (section.getMinPass() != null && sectionEarned < section.getMinPass()) {
                sectionPass = false;
            }
        }

        // Questions whose type is not represented in score profile sections contribute proportionally.
        int unmappedTotal = 0;
        int unmappedCorrect = 0;
        for (Map.Entry<String, Integer> entry : totalByType.entrySet()) {
            if (!sectionTypes.contains(entry.getKey())) {
                unmappedTotal += entry.getValue();
                unmappedCorrect += correctByType.getOrDefault(entry.getKey(), 0);
            }
        }

        double maxTotal = scoreProfile.getMaxTotal() != null ? scoreProfile.getMaxTotal() : fallbackMaxTotal;
        if (unmappedTotal > 0 && maxTotal > fallbackMaxTotal) {
            double remaining = maxTotal - fallbackMaxTotal;
            earnedScore += ((double) unmappedCorrect / unmappedTotal) * remaining;
        }

        if (maxTotal <= 0.0) {
            maxTotal = fallbackMaxTotal > 0 ? fallbackMaxTotal : answers.size();
        }

        earnedScore = Math.max(0.0, Math.min(earnedScore, maxTotal));
        double score = maxTotal;

        String levelSuggestion = null;
        boolean totalPass = scoreProfile.getMinTotalPass() == null || earnedScore >= scoreProfile.getMinTotalPass();
        if (totalPass && sectionPass && scoreProfile.getLevel() != null && !scoreProfile.getLevel().isBlank()) {
            levelSuggestion = scoreProfile.getLevel();
        }
        
        log.info("Graded attempt {} with profile {}, correct={}/{}, earnedScore={}, maxTotal={}, score={}%, levelSuggestion={}",
            attemptId, scoreProfile.getId(), correctCount, answers.size(), earnedScore, maxTotal, score, levelSuggestion);
        return new GradeResult(score, earnedScore, levelSuggestion, answers.size());
    }

    private String mapQuestionTypeToSectionType(String questionType) {
        if (questionType == null) {
            return "VOCAB";
        }
        return switch (questionType.toUpperCase(Locale.ROOT)) {
            case "KANJI" -> "VOCAB";
            default -> questionType.toUpperCase(Locale.ROOT);
        };
    }
}
