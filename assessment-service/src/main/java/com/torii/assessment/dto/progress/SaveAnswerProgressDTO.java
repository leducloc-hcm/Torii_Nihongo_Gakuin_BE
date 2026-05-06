package com.torii.assessment.dto.progress;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SaveAnswerProgressDTO {

    @NotNull
    private Long progressId;

    @NotNull
    private Long questionId;

    private Long selectedOptionId;
    private Integer timeSpentSec;
    private Boolean isFlagged;
}
