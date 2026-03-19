package com.torii.assessment.controller;

import com.torii.assessment.messaging.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
@Slf4j
public class EnrollmentController {

    private final EventPublisher eventPublisher;

    /**
     * Create course enrollment (assessment-service orchestrates, learning-service writes DB).
     *
     * Body:
     * {
     *   "userId": 123,
     *   "courseId": 456,
     *   "courseType": "VIDEO_QUIZ" | "VIDEO_QUIZ_LIVE" | "LIVE_ONLY",
     *   "expiresAt": "2027-03-18T00:00:00Z" (optional; if omitted => +1 year)
     * }
     */
    @PostMapping("/course")
    public ResponseEntity<Map<String, Object>> enrollCourse(@RequestBody Map<String, Object> body) {
        Long userId = body.get("userId") == null ? null : Long.valueOf(body.get("userId").toString());
        Long courseId = body.get("courseId") == null ? null : Long.valueOf(body.get("courseId").toString());
        String courseType = body.get("courseType") == null ? null : body.get("courseType").toString();

        if (userId == null || courseId == null || courseType == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "userId, courseId, courseType are required"
            ));
        }

        String expiresAt = body.get("expiresAt") == null
            ? Instant.now().plus(365, ChronoUnit.DAYS).toString()
            : body.get("expiresAt").toString();

        eventPublisher.publishEnrollmentCreate(userId, courseId, courseType, expiresAt, null);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Enrollment request queued",
            "userId", userId,
            "courseId", courseId,
            "expiresAt", expiresAt
        ));
    }

    /**
     * Add user to class (assessment-service orchestrates, learning-service writes DB).
     *
     * Body: { "userId": 123, "classId": 999, "role": "CUSTOMER" }
     */
    @PostMapping("/class")
    public ResponseEntity<Map<String, Object>> addToClass(@RequestBody Map<String, Object> body) {
        Long userId = body.get("userId") == null ? null : Long.valueOf(body.get("userId").toString());
        Long classId = body.get("classId") == null ? null : Long.valueOf(body.get("classId").toString());
        String role = body.get("role") == null ? "CUSTOMER" : body.get("role").toString();

        if (userId == null || classId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "userId and classId are required"
            ));
        }

        eventPublisher.publishClassMemberCreate(userId, classId, role, null);

        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Class member request queued",
            "userId", userId,
            "classId", classId,
            "role", role
        ));
    }
}

