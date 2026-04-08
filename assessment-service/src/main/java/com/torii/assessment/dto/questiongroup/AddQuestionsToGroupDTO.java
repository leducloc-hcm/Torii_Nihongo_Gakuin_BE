package com.torii.assessment.dto.questiongroup;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddQuestionsToGroupDTO {

    @NotEmpty(message = "At least 1 question required")
    @Size(max = 50, message = "Maximum 50 questions per operation")
    private List<Long> questionIds;

    private List<Long> questions;
}

