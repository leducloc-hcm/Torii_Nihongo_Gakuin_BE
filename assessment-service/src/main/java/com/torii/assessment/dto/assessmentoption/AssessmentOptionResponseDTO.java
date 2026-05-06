package com.torii.assessment.dto.assessmentoption;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentOptionResponseDTO {
    private Long id;
    private Long questionId;
    private String content;
    private Boolean isCorrect;
    private Integer order;
    private LocalDateTime createdAt;
}
