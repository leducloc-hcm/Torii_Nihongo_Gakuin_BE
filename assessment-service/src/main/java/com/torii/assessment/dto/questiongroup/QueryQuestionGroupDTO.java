package com.torii.assessment.dto.questiongroup;

import com.torii.assessment.entity.QuestionGroup;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueryQuestionGroupDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 10;

    private QuestionGroup.QuestionGroupType type;

    private Boolean hasMedia;

    private Boolean hasPassage;

    private String keyword;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortOrder = "desc";
}

