package com.torii.assessment.dto.section;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssessmentSectionDTO {

    @NotNull(message = "Assessment ID is required")
    private Long assessmentId;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Type is required")
    @Pattern(regexp = "VOCAB|GRAMMAR|READING|LISTENING",
            message = "Type must be VOCAB, GRAMMAR, READING or LISTENING")
    private String type;

    private Integer timeLimitSec;

    @Min(value = 0, message = "Order must be >= 0")
    private Integer order;
}
