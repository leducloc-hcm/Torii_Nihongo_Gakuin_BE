package com.torii.assessment.dto.option;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OptionResponseDTO {
    private Long id;
    private Long questionId;
    private String content;
    private Boolean isCorrect;
    private Integer order;
    private Long mediaId;
    private QuestionDTO question;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionDTO {
        private Long id;
        private String stem;
        private String type;
        private String level;
    }
}

