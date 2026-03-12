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
    private Long itemCount;
}
