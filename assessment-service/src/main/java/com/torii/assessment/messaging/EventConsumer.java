package com.torii.assessment.messaging;

import com.torii.assessment.config.RabbitMQConfig;
import com.torii.assessment.service.UserCourseAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {

    private final UserCourseAccessService userCourseAccessService;
    
    @RabbitListener(queues = "assessment.course.enrolled")
    public void handleCourseEnrolled(Map<String, Object> event) {
        log.info("Received course.enrolled event: {}", event);
        try {
            Map<String, Object> payload = extractPayload(event);
            Integer userId = payload.get("userId") == null ? null : Integer.valueOf(payload.get("userId").toString());
            Integer courseId = payload.get("courseId") == null ? null : Integer.valueOf(payload.get("courseId").toString());

            if (userId == null || courseId == null) {
                log.warn("course.enrolled missing userId/courseId payload={}", payload);
                return;
            }

            userCourseAccessService.grantAccess(userId, courseId, "course.enrolled");
            log.info("Granted assessment access: userId={}, courseId={}", userId, courseId);
        } catch (Exception e) {
            log.error("Failed to process course.enrolled: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    @RabbitListener(queues = "assessment.payment.completed")
    public void handlePaymentCompleted(Map<String, Object> event) {
        log.info("Received payment.completed event: {}", event);
        // Best-effort: if payload contains courseIds, grant access for each course.
        // (Keep compatible with older payloads that only include userId/orderId/amount.)
        try {
            Map<String, Object> payload = extractPayload(event);
            Integer userId = payload.get("userId") == null ? null : Integer.valueOf(payload.get("userId").toString());
            Object courseIdsObj = payload.get("courseIds");

            if (userId == null) {
                log.warn("payment.completed missing userId payload={}", payload);
                return;
            }

            if (courseIdsObj instanceof Iterable<?> iterable) {
                for (Object c : iterable) {
                    if (c == null) continue;
                    Integer courseId = Integer.valueOf(c.toString());
                    userCourseAccessService.grantAccess(userId, courseId, "payment.completed");
                }
            }
        } catch (Exception e) {
            log.error("Failed to process payment.completed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractPayload(Map<String, Object> event) {
        Object payload = event.get("payload");
        if (payload instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return event;
    }
}

