package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "assessment_logs", schema = "assessment")
@Data
public class AssessmentLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Column(length = 50)
    private String action;

    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(columnDefinition = "JSONB")
    private String metadata;

    @Column(name = "updated_by")
    private Integer updatedBy;

    @Column(name = "updated_by_name", length = 255)
    private String updatedByName;

    @Column(name = "change_summary", length = 255)
    private String changeSummary;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
