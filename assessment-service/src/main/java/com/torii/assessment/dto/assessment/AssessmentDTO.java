package com.torii.assessment.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDTO {
    private Long id;
    private String title;
    private String level;
    private String type;
    private String visibility;
    private String description;
    private Integer courseId;
    private Integer createdBy;
    private Integer lessonId;
    private Long classId;
    private Integer assignedToId;
    private Boolean lockAfterDue;
    private Integer timeLimitSec;
    private Integer maxAttempts;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private LocalDateTime startAt;
    private LocalDateTime dueAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
