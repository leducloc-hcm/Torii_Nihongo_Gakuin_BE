package com.torii.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;

@Entity
@Table(name = "item_assessment_questions", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ItemAssessmentQuestion.ItemAssessmentQuestionId.class)
public class ItemAssessmentQuestion {

    @Id
    @Column(name = "item_id")
    private Long itemId;

    @Id
    @Column(name = "question_id")
    private Long questionId;

    @Column(name = "order")
    private Integer order;

    @Column(name = "score", precision = 10, scale = 2)
    private BigDecimal score;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemAssessmentQuestionId implements Serializable {
        private Long itemId;
        private Long questionId;
    }
}
