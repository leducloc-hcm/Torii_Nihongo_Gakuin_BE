package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "sections", schema = "assessment")
@Data
public class AssessmentSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "time_limit_sec")
    private Integer timeLimitSec;

    @Column(nullable = false, length = 20)
    private String type; // VOCAB, GRAMMAR, READING, LISTENING

    @Column(name = "\"order\"")
    private Integer order;

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = java.time.LocalDateTime.now();
    }
}
