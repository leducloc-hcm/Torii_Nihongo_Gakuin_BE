package com.torii.assessment.repository;

import com.torii.assessment.entity.QuestionGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuestionGroupRepository extends JpaRepository<QuestionGroup, Long>, JpaSpecificationExecutor<QuestionGroup> {

    // Find by type
    List<QuestionGroup> findByType(QuestionGroup.QuestionGroupType type);
    Page<QuestionGroup> findByType(QuestionGroup.QuestionGroupType type, Pageable pageable);

    // Find by uuid (for versioning)
    List<QuestionGroup> findByUuidOrderByVersionDesc(String uuid);

    Optional<QuestionGroup> findByUuidAndVersion(String uuid, Integer version);

    // Count by type
    long countByType(QuestionGroup.QuestionGroupType type);

    // Count with media
    long countByMediaIdIsNotNull();

    // Count without media
    long countByMediaIdIsNull();

    // Count with passage
    long countByPassageIsNotNull();

    // Count without passage
    long countByPassageIsNull();

    // Find with questions eagerly loaded
    @Query("SELECT DISTINCT qg FROM QuestionGroup qg LEFT JOIN FETCH qg.questions WHERE qg.id = :id")
    Optional<QuestionGroup> findByIdWithQuestions(@Param("id") Long id);

    // Check if exists
    boolean existsById(Long id);
}

