package com.torii.assessment.service;

import com.torii.assessment.entity.UserCourseAccess;
import com.torii.assessment.repository.UserCourseAccessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserCourseAccessService {

    private final UserCourseAccessRepository repository;

    @Transactional
    public void grantAccess(Integer userId, Integer courseId, String reason) {
        repository.findByUserIdAndCourseId(userId, courseId).ifPresentOrElse(existing -> {
            // idempotent "upsert": refresh unlockedAt and reason
            existing.setUnlockedAt(LocalDateTime.now());
            if (reason != null) existing.setReason(reason);
            repository.save(existing);
        }, () -> {
            UserCourseAccess access = new UserCourseAccess();
            access.setUserId(userId);
            access.setCourseId(courseId);
            access.setReason(reason);
            repository.save(access);
        });
    }

    public boolean hasAccess(Integer userId, Integer courseId) {
        return repository.existsByUserIdAndCourseId(userId, courseId);
    }
}

