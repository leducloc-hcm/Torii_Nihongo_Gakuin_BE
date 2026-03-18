package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "items", schema = "assessment")
@Data
public class AssessmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "section_id", nullable = false)
    private Long sectionId;

    private String name;

    @Column(name = "score_per_question", precision = 10, scale = 2)
    private BigDecimal scorePerQuestion;

    @Column(name = "\"order\"")
    private Integer order;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
