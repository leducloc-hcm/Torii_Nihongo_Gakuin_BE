package com.torii.assessment.dto.section;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentSectionWithItemsDTO {
    private Long id;
    private Long assessmentId;
    private String title;
    private Integer timeLimitSec;
    private String type;
    private Integer order;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
    private List<ItemDTO> items;
}
