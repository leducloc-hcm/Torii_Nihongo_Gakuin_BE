package com.torii.assessment.dto.itemassessment;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateItemAssessmentQuestionsDTO {
    @Valid
    private List<ItemAssessmentQuestionLinkDTO> questions;
}
