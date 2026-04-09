package com.torii.assessment.dto.attempt;

import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class SubmitAttemptRequestDTO {
    private List<@Valid SubmitAnswerDTO> answers;
}
