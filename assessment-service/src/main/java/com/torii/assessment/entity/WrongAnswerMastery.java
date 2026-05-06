package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "wrong_answer_mastery", schema = "assessment",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "question_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WrongAnswerMastery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "attempt_id")
    private Long attemptId;

    @Column(name = "mastered_at")
    private LocalDateTime masteredAt;

    @PrePersist
    protected void onCreate() {
        if (masteredAt == null) {
            masteredAt = LocalDateTime.now();
        }
    }
}
