package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.entity.QuestionGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryAssessmentQuestionGroupDTO {
    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 20;

    private Long itemId;
    private QuestionGroup.QuestionGroupType type;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortOrder = "desc";
}
