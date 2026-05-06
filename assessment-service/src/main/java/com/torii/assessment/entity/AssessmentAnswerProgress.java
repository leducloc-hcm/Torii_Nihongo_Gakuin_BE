package com.torii.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
    name = "answer_progress",
    schema = "assessment",
    uniqueConstraints = @UniqueConstraint(name = "uk_answer_progress_progress_question", columnNames = {"progress_id", "question_id"})
)
@Data
public class AssessmentAnswerProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "progress_id", nullable = false)
    private Long progressId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "selected_option_id")
    private Long selectedOptionId;

    @Column(name = "time_spent_sec")
    private Integer timeSpentSec;

    @Column(name = "is_flagged")
    private Boolean isFlagged;

    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdatedAt;

    @PrePersist
    protected void onCreate() {
        if (lastUpdatedAt == null) {
            lastUpdatedAt = LocalDateTime.now();
        }
        if (timeSpentSec == null) {
            timeSpentSec = 0;
        }
        if (isFlagged == null) {
            isFlagged = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdatedAt = LocalDateTime.now();
    }
}
