package com.torii.assessment.dto.progress;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AssessmentAnswerProgressDTO {
    private Long id;
    private Long progressId;
    private Long questionId;
    private Long selectedOptionId;
    private Integer timeSpentSec;
    private Boolean isFlagged;
    private LocalDateTime lastUpdatedAt;
}
