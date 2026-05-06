package com.torii.assessment.dto.assessmentquestiongroup;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModifyAssessmentGroupQuestionsDTO {
    @NotEmpty(message = "Question IDs are required")
    private List<Long> questionIds;
    private List<Long> assessmentQuestionIds;
}
