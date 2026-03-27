package com.torii.assessment.dto.progress;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AutoSaveProgressDTO {

    @NotNull
    private Long progressId;

    private Long currentAttemptId;
    private Integer currentSection;
    private Integer currentQuestion;
    private Integer timeSpentSec;
    private Integer remainingSec;
}
