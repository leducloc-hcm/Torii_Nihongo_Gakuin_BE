package com.torii.assessment.dto.attempt;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttemptReviewDetailDTO {
    private Long attemptId;
    private Integer attemptNo;
    private Integer userId;
    private Long assessmentId;
    private String assessmentTitle;
    private String type;
    private String level;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Double score;
    private Double earnedScore;
    private Double fullScore;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private List<SectionDetailDTO> sectionDetails;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionDetailDTO {
        private Long sectionId;
        private String sectionTitle;
        private String sectionType;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Double earnedScore;
        private Double fullScore;
        private List<QuestionResultDTO> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResultDTO {
        private Long questionId;
        private String stem;
        private Boolean isCorrect;
        private Long selectedOptionId;
        private Long correctOptionId;
        private Integer timeSpentSec;
        private List<OptionResultDTO> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResultDTO {
        private Long id;
        private String content;
        private Boolean isCorrect;
        private Integer order;
    }
}
