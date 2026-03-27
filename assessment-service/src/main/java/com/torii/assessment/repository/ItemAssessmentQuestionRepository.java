package com.torii.assessment.repository;

import com.torii.assessment.entity.ItemAssessmentQuestion;
import com.torii.assessment.entity.ItemAssessmentQuestion.ItemAssessmentQuestionId;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemAssessmentQuestionRepository extends JpaRepository<ItemAssessmentQuestion, ItemAssessmentQuestionId> {

    List<ItemAssessmentQuestion> findByItemIdOrderByOrderAsc(Long itemId);

    @Modifying
    @Query("DELETE FROM ItemAssessmentQuestion q WHERE q.itemId = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);
}
