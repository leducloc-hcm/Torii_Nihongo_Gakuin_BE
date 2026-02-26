package com.torii.assessment.dto.question;

import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkCreateQuestionsDTO {

    @Size(min = 1, max = 50, message = "Must have between 1 and 50 questions")
    private List<CreateQuestionDTO> questions;
}

