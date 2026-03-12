package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;

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

    @Column(name = "score_per_question")
    private Double scorePerQuestion;

    @Column(name = "\"order\"")
    private Integer order;
}
