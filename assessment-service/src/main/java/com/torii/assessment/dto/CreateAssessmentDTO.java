package com.torii.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class CreateAssessmentDTO {
    @NotBlank
    private String title;
    
    @NotBlank
    private String level; // N5, N4, N3, N2, N1
    
    @NotBlank
    private String type; // TEST, EXAM
    
    private String visibility = "PRIVATE";
    
    @NotNull
    private Integer createdBy;
    
    private Long scoreProfileId;
    
    private List<SectionDTO> sections;
}
