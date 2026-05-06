package com.torii.assessment.dto.progress;

import com.torii.assessment.entity.AssessmentProgress;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AssessmentProgressDTO {
    private Long id;
    private Long assessmentId;
    private Integer userId;
    private Long assignmentId;
    private Long currentAttemptId;
    private Integer currentSection;
    private Integer currentQuestion;
    private Integer timeSpentSec;
    private Integer remainingSec;
    private Boolean isSubmitted;
    private AssessmentProgress.ProgressStatus status;
    private LocalDateTime completedAt;
    private LocalDateTime startedAt;
    private LocalDateTime lastSavedAt;
}
