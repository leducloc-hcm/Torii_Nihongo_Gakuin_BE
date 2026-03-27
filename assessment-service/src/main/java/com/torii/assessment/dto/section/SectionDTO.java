package com.torii.assessment.dto.section;

import lombok.Data;
import java.util.List;

@Data
public class SectionDTO {
    private Long id;
    private String title;
    private Integer timeLimitSec;
    private String type; // VOCAB, GRAMMAR, READING, LISTENING
    private Integer order;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime updatedAt;
    private List<ItemDTO> items;
}
