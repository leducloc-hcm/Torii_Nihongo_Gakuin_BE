package com.torii.assessment.repository;

import com.torii.assessment.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, Long> {
    List<Attempt> findByUserId(Integer userId);
    List<Attempt> findByAssessmentId(Long assessmentId);
}
