package com.torii.assessment.dto.assessmentquestion;

import com.torii.assessment.entity.Question;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentQuestionDTO {
    private Question.QuestionType type;
    private Question.JLPTLevel level;
    private Question.Difficulty difficulty;
    private String stem;
    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;
}
