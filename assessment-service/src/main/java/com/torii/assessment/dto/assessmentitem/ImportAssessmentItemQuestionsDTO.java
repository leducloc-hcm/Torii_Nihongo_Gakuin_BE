package com.torii.assessment.dto.assessmentitem;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportAssessmentItemQuestionsDTO {

    @NotEmpty(message = "questionIds is required")
    private List<@NotNull(message = "Question ID is required") @Positive(message = "Question ID must be positive") Long> questionIds;
}
