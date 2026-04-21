package com.torii.assessment.repository;

import com.torii.assessment.entity.WrongAnswerMastery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface WrongAnswerMasteryRepository extends JpaRepository<WrongAnswerMastery, Long> {

    List<WrongAnswerMastery> findByUserId(Integer userId);

    Set<WrongAnswerMastery> findByUserIdAndQuestionIdIn(Integer userId, Set<Long> questionIds);

    boolean existsByUserIdAndQuestionId(Integer userId, Long questionId);

    void deleteByUserIdAndQuestionId(Integer userId, Long questionId);
}
