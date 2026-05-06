package com.torii.assessment.repository;

import com.torii.assessment.entity.Question;
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
public interface QuestionRepository extends JpaRepository<Question, Long>, JpaSpecificationExecutor<Question> {

    // Find by type
    List<Question> findByType(Question.QuestionType type);
    Page<Question> findByType(Question.QuestionType type, Pageable pageable);

    // Find by level
    List<Question> findByLevel(Question.JLPTLevel level);
    Page<Question> findByLevel(Question.JLPTLevel level, Pageable pageable);

    // Find by difficulty
    List<Question> findByDifficulty(Question.Difficulty difficulty);
    Page<Question> findByDifficulty(Question.Difficulty difficulty, Pageable pageable);

    // Find by type and level
    List<Question> findByTypeAndLevel(Question.QuestionType type, Question.JLPTLevel level);

    // Count by type
    long countByType(Question.QuestionType type);

    // Count by level
    long countByLevel(Question.JLPTLevel level);

    // Count by difficulty
    long countByDifficulty(Question.Difficulty difficulty);

    // Count with media
    long countByMediaIdIsNotNull();

    // Count without media
    long countByMediaIdIsNull();

    // Search by keyword in stem, passage, explanation
    @Query("SELECT q FROM Question q WHERE " +
           "LOWER(q.stem) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(q.passage) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(q.explanation) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Question> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // Check if question exists
    boolean existsById(Long id);

    // Find with options eagerly loaded
    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.options WHERE q.id = :id")
    Optional<Question> findByIdWithOptions(@Param("id") Long id);

    // Find all with options
    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.options")
    List<Question> findAllWithOptions();
}

