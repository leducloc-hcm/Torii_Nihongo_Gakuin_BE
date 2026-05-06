package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentLogRepository extends JpaRepository<AssessmentLog, Long> {

    Page<AssessmentLog> findByAssessmentIdOrderByCreatedAtDesc(Long assessmentId, Pageable pageable);

    List<AssessmentLog> findByAssessmentIdOrderByCreatedAtDesc(Long assessmentId);

    Page<AssessmentLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId, Pageable pageable);
}
