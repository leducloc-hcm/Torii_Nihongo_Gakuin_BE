package com.torii.assessment.dto.scoreprofile;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ScoreProfileResponseDTO {
    private Long id;
    private String name;
    private String level;
    private Integer maxTotal;
    private Integer minTotalPass;
    private String notes;
    private List<ScoreProfileSectionDTO> sections;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
