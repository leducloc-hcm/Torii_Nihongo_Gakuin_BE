package com.torii.assessment.dto.option;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class ReorderOptionsDTO {

    @Size(min = 1, message = "At least 1 option required")
    private List<ReorderItem> options;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReorderItem {
        @NotNull(message = "Option ID is required")
        private Long id;

        @NotNull(message = "Order is required")
        @Min(value = 0, message = "Order must be non-negative")
        private Integer order;
    }
}

