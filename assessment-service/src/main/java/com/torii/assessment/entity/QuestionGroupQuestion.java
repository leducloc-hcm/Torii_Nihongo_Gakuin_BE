package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "question_group_questions", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(QuestionGroupQuestion.QuestionGroupQuestionId.class)
public class QuestionGroupQuestion {

    @Id
    @Column(name = "question_id")
    private Long questionId;

    @Id
    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "\"order\"")
    private Integer order;

    @Column(name = "score")
    private Double score;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", insertable = false, updatable = false)
    private Question question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", insertable = false, updatable = false)
    private QuestionGroup questionGroup;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // Composite Primary Key class
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionGroupQuestionId implements Serializable {
        private Long questionId;
        private Long groupId;
    }
}

