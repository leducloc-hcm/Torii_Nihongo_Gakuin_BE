package com.torii.assessment.repository;

import com.torii.assessment.entity.Assessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentRepository extends JpaRepository<Assessment, Long>, JpaSpecificationExecutor<Assessment> {
    List<Assessment> findByLevel(String level);
    List<Assessment> findByType(String type);
    List<Assessment> findByLevelAndType(String level, String type);
    Page<Assessment> findAll(Pageable pageable);
}
