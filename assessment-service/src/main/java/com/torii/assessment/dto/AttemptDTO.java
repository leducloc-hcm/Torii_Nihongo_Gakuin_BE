package com.torii.assessment.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AttemptDTO {
    private Long id;
    private Long assessmentId;
    private Integer userId;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Double score;
    private String levelSuggestion;
    private Double earnedScore;
    private List<AnswerDTO> answers;
}
