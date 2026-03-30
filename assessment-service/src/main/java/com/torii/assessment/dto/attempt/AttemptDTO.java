package com.torii.assessment.dto.attempt;

import com.torii.assessment.dto.answer.AnswerDTO;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AttemptDTO {
    private Long id;
    private Long assessmentId;
    private Integer userId;
    private Long progressId;
    private Integer attemptNo;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
    private Double score;
    private Double earnedScore;
    private String levelSuggestion;
    private List<AnswerDTO> answers;
}
