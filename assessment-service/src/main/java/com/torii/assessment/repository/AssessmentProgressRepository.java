package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentProgressRepository extends JpaRepository<AssessmentProgress, Long> {
    Optional<AssessmentProgress> findByAssessmentIdAndUserId(Long assessmentId, Integer userId);
    List<AssessmentProgress> findByUserIdOrderByStartedAtDesc(Integer userId);
    List<AssessmentProgress> findByAssessmentIdOrderByStartedAtDesc(Long assessmentId);
}
