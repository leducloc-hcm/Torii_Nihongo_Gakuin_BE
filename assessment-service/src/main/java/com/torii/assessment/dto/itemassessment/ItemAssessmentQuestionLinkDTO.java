package com.torii.assessment.dto.itemassessment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemAssessmentQuestionLinkDTO {
    @NotNull(message = "Question ID is required")
    @Positive(message = "Question ID must be positive")
    private Long questionId;

    private Integer order;
    private BigDecimal score;
}
