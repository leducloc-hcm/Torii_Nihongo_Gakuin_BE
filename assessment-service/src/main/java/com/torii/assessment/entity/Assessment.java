package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "assessments", schema = "assessment")
@Data
public class Assessment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String description;

    // Matches assessment_type enum in the DB (QUIZ, TEST, EXAM, ASSIGNMENT)
    private String type;

    // Level code (e.g., N5, N4, N3, N2, N1)
    private String level;

    // Visibility enum: PRIVATE, UNLISTED, PUBLIC
    private String visibility = "PRIVATE";

    @Column(name = "created_by", nullable = false)
    private Integer createdBy;

    @Column(name = "lesson_id")
    private Integer lessonId;

    @Column(name = "class_id")
    private Long classId;

    @Column(name = "assigned_to_id")
    private Integer assignedToId;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "lock_after_due")
    private Boolean lockAfterDue = false;

    @Column(name = "time_limit_sec")
    private Integer timeLimitSec;

    @Column(name = "max_attempts")
    private Integer maxAttempts;

    @Column(name = "shuffle_questions")
    private Boolean shuffleQuestions = false;

    @Column(name = "shuffle_options")
    private Boolean shuffleOptions = false;

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
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
