package com.torii.assessment.dto.assessmentoption;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentOptionDTO {
    private String content;
    private Boolean isCorrect;
    private Integer order;
}
