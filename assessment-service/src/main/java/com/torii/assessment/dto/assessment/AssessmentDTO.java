package com.torii.assessment.dto.assessment;

import com.torii.assessment.dto.SectionDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentDTO {
    private Long id;
    private String title;
    private String level;
    private String type;
    private String visibility;
    private String description;
    private Integer createdBy;
    private Long scoreProfileId;
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionDTO> sections;
}
