package com.torii.assessment.dto.attempt;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WrongAnswerLabGradeRequestDTO {

    @NotEmpty
    @Valid
    private List<AnswerDTO> answers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerDTO {
        @NotNull
        private Long questionId;

        @NotNull
        private Long selectedOptionId;
    }
}
