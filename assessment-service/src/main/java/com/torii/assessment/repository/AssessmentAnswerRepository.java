package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentAnswerRepository extends JpaRepository<AssessmentAnswer, Long> {
    List<AssessmentAnswer> findByAttemptIdOrderByIdAsc(Long attemptId);
    Optional<AssessmentAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);
    boolean existsByAttemptIdAndQuestionId(Long attemptId, Long questionId);
    long countByAttemptId(Long attemptId);
    long countByAttemptIdAndSelectedOptionIdIsNotNull(Long attemptId);
    long countByAttemptIdAndIsCorrectTrue(Long attemptId);
    long deleteByAttemptId(Long attemptId);
}
