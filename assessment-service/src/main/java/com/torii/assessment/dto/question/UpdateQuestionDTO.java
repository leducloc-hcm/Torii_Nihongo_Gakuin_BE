package com.torii.assessment.dto.question;

import com.torii.assessment.entity.Question;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateQuestionDTO {

    private Question.QuestionType type;

    private Question.JLPTLevel level;

    private Question.Difficulty difficulty;

    @Size(min = 1, max = 2000, message = "Question stem must be between 1 and 2000 characters")
    private String stem;

    @Size(max = 5000, message = "Passage must not exceed 5000 characters")
    private String passage;

    private Long mediaId;

    @Size(max = 2000, message = "Explanation must not exceed 2000 characters")
    private String explanation;

    private Question.ReadingLength readingLength;

    @Size(min = 2, max = 6, message = "Question must have between 2 and 6 options")
    private List<UpdateOptionDTO> options;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class UpdateOptionDTO {
        private Long id;

        @Size(max = 1000, message = "Option content must not exceed 1000 characters")
        private String content;

        private Boolean isCorrect;

        @Min(value = 0, message = "Order must be non-negative")
        private Integer order;

        private Long mediaId;
    }
}

