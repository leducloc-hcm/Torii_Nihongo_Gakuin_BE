package com.torii.assessment.dto.attempt;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveAiQuestionDTO {

    @NotNull
    private Long assessmentId;

    @NotNull
    private Long sourceQuestionId;

    @NotBlank
    private String sectionType;

    @NotBlank
    private String stem;

    @NotBlank
    private String options;

    @NotBlank
    private String correctAnswer;

    private String explanation;
}
