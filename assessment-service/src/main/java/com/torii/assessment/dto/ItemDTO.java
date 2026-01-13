package com.torii.assessment.dto;

import lombok.Data;
import java.util.List;

@Data
public class ItemDTO {
    private Long id;
    private String name;
    private Double scorePerQuestion;
    private Integer order;
    private List<Long> questionIds;
    private List<Long> groupIds;
}
