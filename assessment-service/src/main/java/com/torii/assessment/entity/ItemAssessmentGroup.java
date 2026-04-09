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
@Table(name = "item_assessment_groups", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(ItemAssessmentGroup.ItemAssessmentGroupId.class)
public class ItemAssessmentGroup {

    @Id
    @Column(name = "item_id")
    private Long itemId;

    @Id
    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "\"order\"")
    private Integer order;

    @Column(name = "score", precision = 10, scale = 2)
    private BigDecimal score;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemAssessmentGroupId implements Serializable {
        private Long itemId;
        private Long groupId;
    }
}
