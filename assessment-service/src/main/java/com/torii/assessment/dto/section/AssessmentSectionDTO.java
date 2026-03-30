package com.torii.assessment.dto.section;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentSectionDTO {
    private Long id;
    private Long assessmentId;
    private String title;
    private Integer timeLimitSec;
    private String type;
    private Integer order;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
    private Long itemCount;
}
