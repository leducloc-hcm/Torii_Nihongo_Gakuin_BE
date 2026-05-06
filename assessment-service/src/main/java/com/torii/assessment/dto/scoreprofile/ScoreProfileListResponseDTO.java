package com.torii.assessment.dto.scoreprofile;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScoreProfileListResponseDTO {
    private List<ScoreProfileResponseDTO> data;
    private PaginationDTO pagination;
    
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaginationDTO {
        private long total;
        private int page;
        private int limit;
        private int totalPages;
    }
}
