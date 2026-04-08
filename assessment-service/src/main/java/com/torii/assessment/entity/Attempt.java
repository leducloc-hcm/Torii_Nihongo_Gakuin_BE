package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "attempts", schema = "assessment")
@Data
public class Attempt {

    public enum AttemptStatus {
        IN_PROGRESS,
        SUBMITTED,
        EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "assessment_id")
    private Long assessmentId;
    
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "progress_id")
    private Long progressId;

    @Column(name = "attempt_no")
    private Integer attemptNo;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", columnDefinition = "attempt_status")
    private AttemptStatus status;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    private Double score;
    
    @Column(name = "earned_score")
    private Double earnedScore;

    @Column(name = "level_suggestion")
    private String levelSuggestion;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (startedAt == null) {
            startedAt = now;
        }
        if (status == null) {
            status = AttemptStatus.IN_PROGRESS;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
