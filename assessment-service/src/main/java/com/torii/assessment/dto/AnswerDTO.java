package com.torii.assessment.dto;

import lombok.Data;

@Data
public class AnswerDTO {
    private Long id;
    private Long questionId;
    private Long selectedOptionId;
    private Boolean isCorrect;
    private Integer timeSpentSec;
    private String explanation;
}
