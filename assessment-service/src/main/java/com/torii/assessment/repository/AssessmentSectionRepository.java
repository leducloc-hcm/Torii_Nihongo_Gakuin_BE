package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentSection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentSectionRepository extends JpaRepository<AssessmentSection, Long>,
        JpaSpecificationExecutor<AssessmentSection> {

    List<AssessmentSection> findByAssessmentId(Long assessmentId);

    Page<AssessmentSection> findAll(Pageable pageable);

    boolean existsByAssessmentIdAndTitle(Long assessmentId, String title);

    boolean existsByAssessmentIdAndTitleAndIdNot(Long assessmentId, String title, Long id);

    @Query(value = "SELECT COUNT(*) FROM assessment.items WHERE section_id = :sectionId", nativeQuery = true)
    long countItemsBySectionId(@Param("sectionId") Long sectionId);
}
