package com.torii.assessment.dto.answer;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AssessmentAnswerSummaryDTO {
    private Long attemptId;
    private long totalQuestions;
    private long answeredQuestions;
    private long correctAnswers;
    private long wrongAnswers;
    private long skippedQuestions;
    private double completionPercentage;
    private double accuracy;
}
