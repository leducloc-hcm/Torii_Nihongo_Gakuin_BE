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
public class CreateOptionDTO {

    private Long questionId;

    @Size(max = 1000, message = "Option content must not exceed 1000 characters")
    private String content;

    @Builder.Default
    private Boolean isCorrect = false;

    @Min(value = 0, message = "Order must be non-negative")
    @Builder.Default
    private Integer order = 0;

    private Long mediaId;
}

