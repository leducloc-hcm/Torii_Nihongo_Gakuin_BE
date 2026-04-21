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
public class GradeAiQuestionDTO {

    @NotNull
    private Long aiQuestionId;

    @NotBlank
    private String selectedAnswer;
}
