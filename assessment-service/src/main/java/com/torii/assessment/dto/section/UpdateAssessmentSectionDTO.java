package com.torii.assessment.dto.section;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAssessmentSectionDTO {

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Pattern(regexp = "VOCAB|GRAMMAR|READING|LISTENING",
            message = "Type must be VOCAB, GRAMMAR, READING or LISTENING")
    private String type;

    private Integer timeLimitSec;
}
