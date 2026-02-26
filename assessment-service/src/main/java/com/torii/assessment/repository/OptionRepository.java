package com.torii.assessment.repository;

import com.torii.assessment.entity.Option;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OptionRepository extends JpaRepository<Option, Long> {

    // Find by question id
    List<Option> findByQuestionIdOrderByOrderAsc(Long questionId);

    Page<Option> findByQuestionId(Long questionId, Pageable pageable);

    // Find by question id and isCorrect
    List<Option> findByQuestionIdAndIsCorrect(Long questionId, Boolean isCorrect);

    // Count by question id
    long countByQuestionId(Long questionId);

    // Count correct options by question id
    long countByQuestionIdAndIsCorrectTrue(Long questionId);

    // Delete all by question id
    @Modifying
    @Query("DELETE FROM Option o WHERE o.questionId = :questionId")
    void deleteAllByQuestionId(@Param("questionId") Long questionId);

    // Get max order for a question
    @Query("SELECT COALESCE(MAX(o.order), -1) FROM Option o WHERE o.questionId = :questionId")
    Integer getMaxOrderByQuestionId(@Param("questionId") Long questionId);

    // Check if any option exists for question
    boolean existsByQuestionId(Long questionId);
}

