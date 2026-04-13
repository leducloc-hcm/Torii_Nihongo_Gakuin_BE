package com.torii.assessment.dto.scoreprofile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ScoreProfileSectionDTO {
    private Long id;
    
    @NotBlank(message = "Section type is required")
    private String type; // VOCAB, GRAMMAR, READING, LISTENING
    
    @NotBlank(message = "Section title is required")
    private String title;
    
    @NotNull(message = "Max score is required")
    @Positive(message = "Max score must be positive")
    private Integer maxScore;
    
    private BigDecimal weight;
    
    private Integer minPass;
}
