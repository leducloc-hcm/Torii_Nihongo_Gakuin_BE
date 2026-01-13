package com.torii.assessment.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AssessmentDTO {
    private Long id;
    private String title;
    private String level; // N5, N4, N3, N2, N1
    private String type; // TEST, EXAM
    private String visibility; // PRIVATE, UNLISTED, PUBLIC
    private Integer createdBy;
    private LocalDateTime createdAt;
    private Long scoreProfileId;
    private Integer version;
    private List<SectionDTO> sections;
}
