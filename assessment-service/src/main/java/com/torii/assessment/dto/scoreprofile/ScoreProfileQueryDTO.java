package com.torii.assessment.dto.scoreprofile;

import lombok.Data;

@Data
public class ScoreProfileQueryDTO {
    private Integer page = 1;
    private Integer limit = 20;
    private String level;
    private String name;
    private String sortBy = "createdAt";
    private String sortOrder = "desc";
}
