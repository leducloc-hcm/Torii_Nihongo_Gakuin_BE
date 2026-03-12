package com.torii.assessment.dto;

import jakarta.validation.Valid;
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
public class UpdateAssessmentDTO {

    private String title;

    @Pattern(regexp = "N[1-5]", message = "Level must be N1, N2, N3, N4 or N5")
    private String level;

    @Pattern(regexp = "TEST|EXAM", message = "Type must be TEST or EXAM")
    private String type;

    @Pattern(regexp = "PRIVATE|UNLISTED|PUBLIC", message = "Visibility must be PRIVATE, UNLISTED or PUBLIC")
    private String visibility;

    private Long scoreProfileId;

    private String description;

    @Valid
    private List<SectionDTO> sections;
}
