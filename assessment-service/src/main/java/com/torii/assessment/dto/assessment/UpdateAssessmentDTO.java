package com.torii.assessment.dto.assessment;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentDTO {

    private String title;

    @Pattern(regexp = "N[1-5]", message = "Level must be N1, N2, N3, N4 or N5")
    private String level;

    @Pattern(regexp = "TEST|EXAM|QUIZ|ASSIGNMENT", message = "Type must be TEST, EXAM, QUIZ or ASSIGNMENT")
    private String type;

    @Pattern(regexp = "PRIVATE|UNLISTED|PUBLIC", message = "Visibility must be PRIVATE, UNLISTED or PUBLIC")
    private String visibility;

    private Integer lessonId;

    private Long classId;

    private Long scoreProfileId;

    private Boolean lockAfterDue;

    private Integer maxAttempts;

    private java.time.LocalDateTime startAt;

    private java.time.LocalDateTime dueAt;
    
    // Optional audit info
    private Integer updatedBy;
}
