package com.torii.assessment.dto.answer;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateAssessmentAnswerDTO {

    @NotNull
    private Long attemptId;

    @NotNull
    private Long questionId;

    private Long selectedOptionId;
    private Integer timeSpentSec;
    private String explanation;
}
