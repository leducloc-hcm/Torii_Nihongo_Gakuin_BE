package com.torii.assessment.dto.progress;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitAssessmentProgressDTO {

    @NotNull
    private Long progressId;
}
