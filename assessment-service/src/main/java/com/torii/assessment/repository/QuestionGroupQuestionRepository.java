package com.torii.assessment.repository;

import com.torii.assessment.entity.QuestionGroupQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionGroupQuestionRepository extends JpaRepository<QuestionGroupQuestion, QuestionGroupQuestion.QuestionGroupQuestionId> {

    // Find by group id
    List<QuestionGroupQuestion> findByGroupIdOrderByOrderAsc(Long groupId);

    // Find by question id
    List<QuestionGroupQuestion> findByQuestionId(Long questionId);

    // Count by group id
    long countByGroupId(Long groupId);

    // Delete all by group id
    @Modifying
    @Query("DELETE FROM QuestionGroupQuestion qgq WHERE qgq.groupId = :groupId")
    void deleteAllByGroupId(@Param("groupId") Long groupId);

    // Delete specific questions from group
    @Modifying
    @Query("DELETE FROM QuestionGroupQuestion qgq WHERE qgq.groupId = :groupId AND qgq.questionId IN :questionIds")
    void deleteByGroupIdAndQuestionIds(@Param("groupId") Long groupId, @Param("questionIds") List<Long> questionIds);

    // Get max order for a group
    @Query("SELECT COALESCE(MAX(qgq.order), 0) FROM QuestionGroupQuestion qgq WHERE qgq.groupId = :groupId")
    Integer getMaxOrderByGroupId(@Param("groupId") Long groupId);

    // Check if question is in any group
    boolean existsByQuestionId(Long questionId);

    // Check if question is in specific group
    boolean existsByGroupIdAndQuestionId(Long groupId, Long questionId);
}

