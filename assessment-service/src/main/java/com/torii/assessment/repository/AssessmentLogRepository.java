package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssessmentLogRepository extends JpaRepository<AssessmentLog, Long> {
}
