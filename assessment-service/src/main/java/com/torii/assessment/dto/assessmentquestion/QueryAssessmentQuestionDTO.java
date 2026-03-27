package com.torii.assessment.dto.assessmentquestion;

import com.torii.assessment.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryAssessmentQuestionDTO {
    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 20;

    private Long assessmentId;
    private Question.QuestionType type;
    private Question.JLPTLevel level;
    private Question.Difficulty difficulty;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortOrder = "desc";
}
