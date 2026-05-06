package com.torii.assessment.dto.assessmentitem;

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
public class AssessmentItemDTO {

    private Long id;
    private Long sectionId;
    private String name;
    private Integer order;
    private BigDecimal scorePerQuestion;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<QuestionResponseDTO> questions;
    private List<QuestionGroupResponseDTO> questionGroups;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResponseDTO {
        private Long id;
        private String stem;
        private String type;
        private String difficulty;
        private String level;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionGroupResponseDTO {
        private Long id;
        private String title;
        private String type;
    }
}
