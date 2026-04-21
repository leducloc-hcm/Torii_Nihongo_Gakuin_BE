package com.torii.assessment.repository;

import com.torii.assessment.entity.AiGeneratedQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiGeneratedQuestionRepository extends JpaRepository<AiGeneratedQuestion, Long> {

    List<AiGeneratedQuestion> findByUserIdAndAssessmentIdAndIsResolvedFalse(Long userId, Long assessmentId);

    List<AiGeneratedQuestion> findByUserIdAndAssessmentIdAndSectionTypeAndIsResolvedFalse(
        Long userId, Long assessmentId, String sectionType);

    List<AiGeneratedQuestion> findByUserIdAndSourceQuestionId(Long userId, Long sourceQuestionId);

    boolean existsByUserIdAndSourceQuestionId(Long userId, Long sourceQuestionId);
}
