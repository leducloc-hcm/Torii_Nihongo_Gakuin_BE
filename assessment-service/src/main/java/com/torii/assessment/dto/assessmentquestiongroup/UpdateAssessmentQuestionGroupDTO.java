package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.Question;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentQuestionGroupDTO {
    private Long assessmentQuestionGroupId;
    private Long originalGroupId;
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
