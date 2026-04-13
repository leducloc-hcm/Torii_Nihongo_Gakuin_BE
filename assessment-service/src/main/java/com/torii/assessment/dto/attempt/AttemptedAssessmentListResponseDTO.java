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
public class AttemptedAssessmentListResponseDTO {

    private List<AttemptedAssessmentDTO> data;
    private PaginationDTO pagination;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttemptedAssessmentDTO {
        private Long assessmentId;
        private String title;
        private String type;
        private String level;
        private Long attemptId;
        private Integer attemptNo;
        private LocalDateTime submittedAt;
        private Double score;
        private Double earnedScore;
        private Double fullScore;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private List<SectionScoreDTO> sectionScores;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionScoreDTO {
        private Long sectionId;
        private String sectionTitle;
        private String sectionType;
        private Integer totalQuestions;
        private Integer correctAnswers;
        private Double earnedScore;
        private Double fullScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaginationDTO {
        private long total;
        private int page;
        private int limit;
        private int totalPages;
        private boolean hasNext;
        private boolean hasPrev;
    }
}
