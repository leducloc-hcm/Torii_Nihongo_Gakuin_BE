package com.torii.assessment.repository;

import com.torii.assessment.entity.AssessmentQuestionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentQuestionGroupRepository extends JpaRepository<AssessmentQuestionGroup, Long>, JpaSpecificationExecutor<AssessmentQuestionGroup> {

    List<AssessmentQuestionGroup> findByAssessmentId(Long assessmentId);
}
