package com.torii.assessment.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDTO {
    private Long id;
    private String title;
    private String level;
    private String type;
    private String visibility;
    private Integer createdBy;
    private Integer lessonId;
    private Long classId;
    private Long scoreProfileId;
    private Boolean lockAfterDue;
    private Integer maxAttempts;
    private Long sectionCount;
    private Long attemptCount;
    private LocalDateTime startAt;
    private LocalDateTime dueAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionDetailDTO> sections;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionDetailDTO {
        private Long id;
        private String title;
        private String type;
        private Integer order;
        private Integer timeLimitSec;
        private List<ItemDetailDTO> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemDetailDTO {
        private Long id;
        private String name;
        private Integer order;
        private BigDecimal scorePerQuestion;
        private List<QuestionDetailDTO> questions;
        private List<QuestionGroupDetailDTO> questionGroups;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionDetailDTO {
        private Long id;
        private Long originalQuestionId;
        private String type;
        private String level;
        private String difficulty;
        private String stem;
        private String passage;
        private String explanation;
        private String mediaUrl;
        private String audioUrl;
        private Long selectedOptionId;
        private List<OptionDetailDTO> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionDetailDTO {
        private Long id;
        private String content;
        private Boolean isCorrect;
        private Integer order;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionGroupDetailDTO {
        private Long id;
        private Long originalGroupId;
        private String type;
        private String level;
        private String difficulty;
        private String stem;
        private String passage;
        private String explanation;
        private String mediaUrl;
        private String audioUrl;
        private List<Long> questionIds;
        private List<QuestionDetailDTO> questions;
    }
}