package com.torii.assessment.dto.questiongroup;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RemoveQuestionsFromGroupDTO {

    @NotEmpty(message = "At least 1 question required")
    private List<Long> questionIds;
}

