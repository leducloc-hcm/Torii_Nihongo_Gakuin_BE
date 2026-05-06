package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.Question;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentQuestionGroupDTO {

    @NotNull(message = "Item ID is required")
    @Positive(message = "Item ID must be positive")
    private Long itemId;

    private Long assessmentQuestionGroupId;
    private Long originalGroupId;

    @NotNull(message = "Type is required")
    private QuestionGroup.QuestionGroupType type;

    private Question.JLPTLevel level;
    private Question.Difficulty difficulty;
    private String stem;
    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;

    private List<Long> questionIds;
    private List<Long> assessmentQuestionIds;
}
