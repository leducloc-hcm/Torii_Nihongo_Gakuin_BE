package com.torii.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "progress",
    schema = "assessment",
    uniqueConstraints = @UniqueConstraint(name = "uk_progress_assessment_user", columnNames = {"assessment_id", "user_id"})
)
@Data
public class AssessmentProgress {

    public enum ProgressStatus {
        IN_PROGRESS,
        SUBMITTED,
        EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assessment_id", nullable = false)
    private Long assessmentId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "assignment_id")
    private Long assignmentId;

    @Column(name = "current_attempt_id")
    private Long currentAttemptId;

    @Column(name = "current_section")
    private Integer currentSection;

    @Column(name = "current_question")
    private Integer currentQuestion;

    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;

    @Column(name = "remaining_sec")
    private Integer remainingSec;

    @Column(name = "is_submitted")
    private Boolean isSubmitted;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ProgressStatus status;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "last_saved_at")
    private LocalDateTime lastSavedAt;

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
        if (lastSavedAt == null) {
            lastSavedAt = now;
        }
        if (isSubmitted == null) {
            isSubmitted = false;
        }
        if (status == null) {
            status = ProgressStatus.IN_PROGRESS;
        }
        if (timeSpentSec == null) {
            timeSpentSec = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        lastSavedAt = LocalDateTime.now();
    }
}
