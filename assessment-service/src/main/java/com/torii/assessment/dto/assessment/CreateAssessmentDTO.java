package com.torii.assessment.dto.assessment;

import com.torii.assessment.dto.SectionDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentDTO {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Level is required")
    @Pattern(regexp = "N[1-5]", message = "Level must be N1, N2, N3, N4 or N5")
    private String level;

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "TEST|EXAM", message = "Type must be TEST or EXAM")
    private String type;

    @Builder.Default
    @Pattern(regexp = "PRIVATE|UNLISTED|PUBLIC", message = "Visibility must be PRIVATE, UNLISTED or PUBLIC")
    private String visibility = "PRIVATE";

    private Integer createdBy;

    private Long scoreProfileId;

    private String description;

    @Valid
    private List<SectionDTO> sections;
}
