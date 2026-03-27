package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentOption;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentOptionRepository extends JpaRepository<AssessmentOption, Long> {

    List<AssessmentOption> findByQuestionIdOrderByOrderAsc(Long questionId);

    Page<AssessmentOption> findByQuestionId(Long questionId, Pageable pageable);

    @Query("SELECT COALESCE(MAX(o.order), -1) FROM AssessmentOption o WHERE o.questionId = :questionId")
    Integer getMaxOrderByQuestionId(@Param("questionId") Long questionId);

    long countByQuestionIdAndIsCorrectTrue(Long questionId);

    @Modifying
    @Query("DELETE FROM AssessmentOption o WHERE o.questionId = :questionId")
    void deleteAllByQuestionId(@Param("questionId") Long questionId);
}
