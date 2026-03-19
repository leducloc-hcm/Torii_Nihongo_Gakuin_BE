package com.torii.assessment.repository;

import com.torii.assessment.entity.UserCourseAccess;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserCourseAccessRepository extends JpaRepository<UserCourseAccess, Long> {
    Optional<UserCourseAccess> findByUserIdAndCourseId(Integer userId, Integer courseId);
    boolean existsByUserIdAndCourseId(Integer userId, Integer courseId);
}

