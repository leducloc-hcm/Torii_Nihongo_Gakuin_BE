package com.torii.assessment.dto.question;

import com.torii.assessment.entity.Question;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueryQuestionDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 10;

    private Question.QuestionType type;

    private Question.JLPTLevel level;

    private Question.Difficulty difficulty;

    private Question.ReadingLength readingLength;

    private String keyword;

    private Boolean hasMedia;

    @Builder.Default
    private String sortBy = "createdAt";

    @Builder.Default
    private String sortOrder = "desc";
}

