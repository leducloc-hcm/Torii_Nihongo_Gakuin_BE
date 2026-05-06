package com.torii.assessment.dto.scoreprofile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class CreateScoreProfileDTO {
    @NotBlank(message = "Profile name is required")
    private String name;
    
    private String level; // N5, N4, N3, N2, N1
    
    private Integer maxTotal;
    
    private Integer minTotalPass;
    
    private String notes;
    
    @NotEmpty(message = "At least one section is required")
    @Valid
    private List<ScoreProfileSectionDTO> sections;
}
