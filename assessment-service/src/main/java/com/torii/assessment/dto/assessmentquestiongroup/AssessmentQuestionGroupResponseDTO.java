package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.entity.QuestionGroup;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentQuestionGroupResponseDTO {
    private Long id;
    private Long originalGroupId;
    private QuestionGroup.QuestionGroupType type;
    private String title;
    private String passage;
    private String mediaUrl;
    private String audioUrl;
    private String metadata;
    private LocalDateTime createdAt;
    private List<Long> questionIds;
}
