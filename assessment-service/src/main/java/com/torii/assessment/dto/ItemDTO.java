package com.torii.assessment.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class ItemDTO {
    private Long id;
    private String name;
    private BigDecimal scorePerQuestion;
    private Integer order;
    private List<Long> questionIds;
    private List<Long> groupIds;
}
