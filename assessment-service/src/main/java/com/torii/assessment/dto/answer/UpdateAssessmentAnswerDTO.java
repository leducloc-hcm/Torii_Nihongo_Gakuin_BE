package com.torii.assessment.dto.answer;

import lombok.Data;

@Data
public class UpdateAssessmentAnswerDTO {
    private Long selectedOptionId;
    private Boolean isCorrect;
    private Integer timeSpentSec;
    private String explanation;
}
