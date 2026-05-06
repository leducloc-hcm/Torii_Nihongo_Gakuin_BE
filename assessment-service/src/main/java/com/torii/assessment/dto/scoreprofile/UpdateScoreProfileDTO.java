package com.torii.assessment.dto.scoreprofile;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class UpdateScoreProfileDTO {
    private String name;
    
    private String level; // N5, N4, N3, N2, N1
    
    private Integer maxTotal;
    
    private Integer minTotalPass;
    
    private String notes;
    
    @Valid
    private List<ScoreProfileSectionDTO> sections;
}
