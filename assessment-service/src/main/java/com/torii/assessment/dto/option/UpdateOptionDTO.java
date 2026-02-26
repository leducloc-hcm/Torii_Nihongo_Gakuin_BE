package com.torii.assessment.dto.option;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOptionDTO {

    @Size(max = 1000, message = "Option content must not exceed 1000 characters")
    private String content;

    private Boolean isCorrect;

    @Min(value = 0, message = "Order must be non-negative")
    private Integer order;

    private Long mediaId;
}

