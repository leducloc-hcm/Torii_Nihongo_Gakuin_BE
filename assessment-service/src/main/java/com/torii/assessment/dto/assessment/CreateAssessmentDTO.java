package com.torii.assessment.dto.assessment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentDTO {

    @NotBlank(message = "Title is required")
    private String title;

    @Pattern(regexp = "N[1-5]", message = "Level must be N1, N2, N3, N4 or N5")
    private String level;

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "TEST|EXAM|QUIZ|ASSIGNMENT", message = "Type must be TEST, EXAM, QUIZ or ASSIGNMENT")
    private String type;

    @Builder.Default
    @Pattern(regexp = "PRIVATE|UNLISTED|PUBLIC", message = "Visibility must be PRIVATE, UNLISTED or PUBLIC")
    private String visibility = "PRIVATE";

    private Integer createdBy;

    private Integer lessonId;

    private Long classId;

    @NotNull(message = "scoreProfileId is required")
    private Long scoreProfileId;

    private Boolean lockAfterDue;

    private Integer maxAttempts;

    private java.time.LocalDateTime startAt;

    private java.time.LocalDateTime dueAt;
}
