package com.torii.assessment.dto.questiongroup;

import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.Question;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateQuestionGroupDTO {

    private Long questionGroupId;

    @NotNull(message = "Question group type is required")
    private QuestionGroup.QuestionGroupType type;

    private Question.JLPTLevel level;

    private Question.Difficulty difficulty;

    private String stem;

    @Size(max = 5000, message = "Passage must not exceed 5000 characters")
    private String passage;

    private String explanation;

    private String mediaUrl;

    private String audioUrl;

    @Builder.Default
    private List<Long> questions = new ArrayList<>();
    private List<Long> questionIds;
}

