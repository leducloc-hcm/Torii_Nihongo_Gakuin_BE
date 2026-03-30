package com.torii.assessment.dto.assessmentoption;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentOptionDTO {

    @NotNull(message = "Question ID is required")
    @Positive(message = "Question ID must be positive")
    private Long questionId;

    @NotBlank(message = "Content is required")
    private String content;

    private Boolean isCorrect;
    private Integer order;
}
