package com.torii.assessment.dto;

import lombok.Data;
import java.util.List;

@Data
public class SectionDTO {
    private Long id;
    private String title;
    private Integer timeLimitSec;
    private String type; // VOCAB, GRAMMAR, READING, LISTENING
    private List<ItemDTO> items;
}
