package com.torii.assessment.dto.progress;

import lombok.Data;

@Data
public class UpdateAnswerProgressDTO {
    private Long selectedOptionId;
    private Integer timeSpentSec;
    private Boolean isFlagged;
}
