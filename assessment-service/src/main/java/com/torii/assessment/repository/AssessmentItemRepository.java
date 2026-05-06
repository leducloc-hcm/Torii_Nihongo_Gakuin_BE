package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentItemRepository extends JpaRepository<AssessmentItem, Long>, JpaSpecificationExecutor<AssessmentItem> {

    List<AssessmentItem> findBySectionIdOrderByOrderAsc(Long sectionId);

    @Query(value = "SELECT question_id FROM assessment.item_assessment_questions WHERE item_id = :itemId ORDER BY \"order\" ASC",
            nativeQuery = true)
    List<Long> findQuestionIdsByItemId(@Param("itemId") Long itemId);

    @Query(value = "SELECT group_id FROM assessment.item_assessment_groups WHERE item_id = :itemId ORDER BY \"order\" ASC",
            nativeQuery = true)
    List<Long> findGroupIdsByItemId(@Param("itemId") Long itemId);

    @Modifying
    @Query(value = "DELETE FROM assessment.item_assessment_questions WHERE item_id = :itemId", nativeQuery = true)
    void deleteQuestionLinksByItemId(@Param("itemId") Long itemId);

    @Modifying
    @Query(value = "DELETE FROM assessment.item_assessment_groups WHERE item_id = :itemId", nativeQuery = true)
    void deleteGroupLinksByItemId(@Param("itemId") Long itemId);

    @Modifying
    @Query(value = "INSERT INTO assessment.item_assessment_questions (item_id, question_id, \"order\") VALUES (:itemId, :questionId, :orderValue)",
            nativeQuery = true)
    void insertQuestionLink(
            @Param("itemId") Long itemId,
            @Param("questionId") Long questionId,
            @Param("orderValue") Integer orderValue
    );

    @Modifying
    @Query(value = "INSERT INTO assessment.item_assessment_groups (item_id, group_id, \"order\") VALUES (:itemId, :groupId, :orderValue)",
            nativeQuery = true)
    void insertGroupLink(
            @Param("itemId") Long itemId,
            @Param("groupId") Long groupId,
            @Param("orderValue") Integer orderValue
    );
}
