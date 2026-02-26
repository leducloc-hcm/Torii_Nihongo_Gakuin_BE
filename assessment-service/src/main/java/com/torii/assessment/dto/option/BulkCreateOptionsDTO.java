package com.torii.assessment.dto.option;

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
public class BulkCreateOptionsDTO {

    @Size(min = 1, max = 10, message = "Must have between 1 and 10 options")
    private List<CreateOptionDTO> options;
}

