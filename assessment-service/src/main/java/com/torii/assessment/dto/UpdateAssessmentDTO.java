package com.torii.assessment.dto;

import lombok.Data;
import java.util.List;

@Data
public class UpdateAssessmentDTO {
    private String title;
    private String level; // N5, N4, N3, N2, N1
    private String type; // TEST, EXAM
    private String visibility;
    private Long scoreProfileId;
    private List<SectionDTO> sections;
}
