package com.torii.assessment.dto.section;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryAssessmentSectionDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 20;

    private String search;  // search in title

    private String type;    // VOCAB, GRAMMAR, READING, LISTENING

    private Long assessmentId;

    @Builder.Default
    private String sortBy = "id";

    @Builder.Default
    private String sortOrder = "asc";
}
