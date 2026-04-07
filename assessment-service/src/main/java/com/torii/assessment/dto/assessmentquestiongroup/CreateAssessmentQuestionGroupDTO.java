package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.entity.QuestionGroup;
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

    private Long originalGroupId;

    @NotNull(message = "Type is required")
    private QuestionGroup.QuestionGroupType type;

    private String title;
    private String passage;
    private String mediaUrl;
    private String audioUrl;
    private String metadata;
    private Integer order;

    private List<Long> questionIds;
}
