package com.torii.assessment.dto.option;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueryOptionDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 10;

    private Boolean isCorrect;

    @Builder.Default
    private String sortBy = "order";

    @Builder.Default
    private String sortOrder = "asc";
}

