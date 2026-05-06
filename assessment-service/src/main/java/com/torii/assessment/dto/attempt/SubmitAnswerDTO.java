package com.torii.assessment.dto.attempt;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitAnswerDTO {
    @NotNull
    private Long questionId;
    
    private Long selectedOptionId;
    
    private Integer timeSpentSec;
}
