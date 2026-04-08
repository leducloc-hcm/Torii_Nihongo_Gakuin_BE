package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "assessment_type")
    private AssessmentType type;

    // Level code (e.g., N5, N4, N3, N2, N1)
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "level", columnDefinition = "jlpt_level")
    private JLPTLevel level;

    // Visibility enum: PRIVATE, UNLISTED, PUBLIC
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "visibility", nullable = false, columnDefinition = "visibility")
    private AssessmentVisibility visibility = AssessmentVisibility.PRIVATE;

    @Column(name = "created_by", nullable = false)
    private Integer createdBy;

    @Column(name = "lesson_id")
    private Integer lessonId;

    @Column(name = "class_id")
    private Long classId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "score_profile_id", nullable = false)
    private ScoreProfile scoreProfile;

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

    public enum AssessmentType {
        TEST,
        EXAM,
        QUIZ,
        ASSIGNMENT
    }

    public enum JLPTLevel {
        N5,
        N4,
        N3,
        N2,
        N1
    }

    public enum AssessmentVisibility {
        PRIVATE,
        UNLISTED,
        PUBLIC
    }
}
