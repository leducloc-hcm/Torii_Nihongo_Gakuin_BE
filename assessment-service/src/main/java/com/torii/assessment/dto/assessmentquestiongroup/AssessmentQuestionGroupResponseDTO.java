package com.torii.assessment.dto.assessmentquestiongroup;

import com.torii.assessment.dto.assessmentquestion.AssessmentQuestionResponseDTO;
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
    private Long assessmentQuestionGroupId;
    private Long originalGroupId;
    private QuestionGroup.QuestionGroupType type;
    private String level;
    private String difficulty;
    private String stem;
    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;
    private LocalDateTime createdAt;
    private List<Long> questionIds;
    private List<Long> assessmentQuestionIds;
    private List<AssessmentQuestionResponseDTO> questions;
}
