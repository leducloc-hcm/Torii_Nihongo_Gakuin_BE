package com.torii.assessment.dto.progress;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StartAssessmentProgressDTO {

    @NotNull
    private Long assessmentId;

    private Long assignmentId;
    private Integer remainingSec;
}
