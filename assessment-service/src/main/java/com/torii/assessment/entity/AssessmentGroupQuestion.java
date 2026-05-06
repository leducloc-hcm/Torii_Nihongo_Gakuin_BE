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

@Entity
@Table(name = "assessment_group_questions", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(AssessmentGroupQuestion.AssessmentGroupQuestionId.class)
public class AssessmentGroupQuestion {

    @Id
    @Column(name = "group_id")
    private Long groupId;

    @Id
    @Column(name = "question_id")
    private Long questionId;

    @Column(name = "\"order\"")
    private Integer order;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentGroupQuestionId implements Serializable {
        private Long groupId;
        private Long questionId;
    }
}
