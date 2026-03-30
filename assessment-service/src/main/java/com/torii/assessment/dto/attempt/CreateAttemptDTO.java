package com.torii.assessment.dto.attempt;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateAttemptDTO {
    @NotNull
    private Long assessmentId;
    
    @NotNull
    private Integer userId;

    private Long progressId;
}
