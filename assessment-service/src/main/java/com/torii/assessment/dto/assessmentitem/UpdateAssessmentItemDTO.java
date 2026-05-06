package com.torii.assessment.dto.assessmentitem;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentItemDTO {

    private String name;

    @Min(value = 0, message = "Order must be greater than or equal to 0")
    private Integer order;

    @DecimalMin(value = "0", inclusive = true, message = "Score per question must be greater than or equal to 0")
    private BigDecimal scorePerQuestion;

    private List<@Positive(message = "Question ID must be a positive number") Long> questionIds;

    private List<@Positive(message = "Question group ID must be a positive number") Long> questionGroupIds;
}
