package com.torii.assessment.dto.assessmentitem;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryAssessmentItemDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 20;

    private Long sectionId;

    @Builder.Default
    private String sortBy = "order";

    @Builder.Default
    private String sortOrder = "asc";
}
