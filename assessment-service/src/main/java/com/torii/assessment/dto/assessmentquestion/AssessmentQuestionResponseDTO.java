package com.torii.assessment.dto.assessmentquestion;

import com.torii.assessment.entity.Question;
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
public class AssessmentQuestionResponseDTO {
    private Long id;
    private Long assessmentId;
    private Long originalQuestionId;
    private Question.QuestionType type;
    private Question.JLPTLevel level;
    private Question.Difficulty difficulty;
    private String stem;
    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;
    private LocalDateTime createdAt;
    private List<com.torii.assessment.dto.assessmentoption.AssessmentOptionResponseDTO> options;
}
