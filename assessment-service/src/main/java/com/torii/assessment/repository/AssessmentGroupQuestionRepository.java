package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentGroupQuestion.AssessmentGroupQuestionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentGroupQuestionRepository extends JpaRepository<AssessmentGroupQuestion, AssessmentGroupQuestionId> {

    List<AssessmentGroupQuestion> findByGroupIdOrderByOrderAsc(Long groupId);

    @Modifying
    @Query("DELETE FROM AssessmentGroupQuestion g WHERE g.groupId = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);
}
