package com.torii.assessment.dto.questiongroup;

import com.torii.assessment.entity.QuestionGroup;
import jakarta.validation.constraints.*;
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
public class UpdateQuestionGroupDTO {

    private QuestionGroup.QuestionGroupType type;

    @Size(max = 500, message = "Title must not exceed 500 characters")
    private String title;

    @Size(max = 5000, message = "Passage must not exceed 5000 characters")
    private String passage;

    private Long mediaId;

    @Min(value = 0, message = "Order must be non-negative")
    private Integer order;

    private Map<String, Object> metadata;

    private List<Long> questions;
}

