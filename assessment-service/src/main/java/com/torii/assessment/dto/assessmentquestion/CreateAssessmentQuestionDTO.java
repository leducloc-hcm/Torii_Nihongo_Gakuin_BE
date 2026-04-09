package com.torii.assessment.dto.assessmentquestion;

import com.torii.assessment.entity.Question;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentQuestionDTO {

    @NotNull(message = "Item ID is required")
    @Positive(message = "Item ID must be positive")
    private Long itemId;

    private Long originalQuestionId;

    @NotNull(message = "Type is required")
    private Question.QuestionType type;

    @NotNull(message = "Level is required")
    private Question.JLPTLevel level;

    private Question.Difficulty difficulty;

    @NotBlank(message = "Stem is required")
    private String stem;

    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;

    private List<CreateAssessmentOptionInlineDTO> options;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateAssessmentOptionInlineDTO {
        @NotBlank(message = "Content is required")
        private String content;
        private Boolean isCorrect;
        private Integer order;
    }
}
