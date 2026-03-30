package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentAnswerProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentAnswerProgressRepository extends JpaRepository<AssessmentAnswerProgress, Long> {
    Optional<AssessmentAnswerProgress> findByProgressIdAndQuestionId(Long progressId, Long questionId);
    List<AssessmentAnswerProgress> findByProgressIdOrderByLastUpdatedAtDesc(Long progressId);
    long deleteByProgressId(Long progressId);
}
