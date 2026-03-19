package com.torii.assessment.messaging;

import com.torii.assessment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {
    
    private final RabbitTemplate rabbitTemplate;
    
    public void publishAttemptSubmitted(Long attemptId, Long userId, Long assessmentId) {
        Map<String, Object> event = Map.of(
            "type", "attempt.submitted",
            "attemptId", attemptId,
            "userId", userId,
            "assessmentId", assessmentId,
            "timestamp", Instant.now().toString()
        );
        
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.ATTEMPT_SUBMITTED_ROUTING_KEY,
            event
        );
        
        log.info("Published attempt.submitted event: attemptId={}, userId={}", attemptId, userId);
    }
    
    public void publishAttemptGraded(Long attemptId, Long userId, Long assessmentId, Double score) {
        Map<String, Object> event = Map.of(
            "type", "attempt.graded",
            "attemptId", attemptId,
            "userId", userId,
            "assessmentId", assessmentId,
            "score", score,
            "timestamp", Instant.now().toString()
        );
        
        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.ATTEMPT_GRADED_ROUTING_KEY,
            event
        );
        
        log.info("Published attempt.graded event: attemptId={}, userId={}, score={}", attemptId, userId, score);
    }

    /**
     * Forward SePay webhook payload to learning-service for payment/enrollment processing.
     * learning-service consumes routingKey = "payment.sepay.webhook"
     */
    public void publishSepayWebhook(Map<String, Object> webhookPayload) {
        Map<String, Object> event = new HashMap<>();
        event.put("type", "payment.sepay.webhook");
        event.put("payload", webhookPayload);
        event.put("timestamp", Instant.now().toString());

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.PAYMENT_SEPAY_WEBHOOK_ROUTING_KEY,
            event
        );

        log.info("Published payment.sepay.webhook event: providerTxnId={}", webhookPayload.get("id"));
    }

    /**
     * Request learning-service to create an enrollment (learning-service owns the enrollment table).
     * routingKey = "enrollment.create"
     */
    public void publishEnrollmentCreate(Long userId, Long courseId, String courseType, String expiresAtIso, Long requestedBy) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("courseId", courseId);
        payload.put("courseType", courseType);
        if (expiresAtIso != null) payload.put("expiresAt", expiresAtIso);
        if (requestedBy != null) payload.put("requestedBy", requestedBy);

        Map<String, Object> event = new HashMap<>();
        event.put("type", "enrollment.create");
        event.put("payload", payload);
        event.put("timestamp", Instant.now().toString());
        event.put("userId", userId);

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.ENROLLMENT_CREATE_ROUTING_KEY,
            event
        );

        log.info("Published enrollment.create event: userId={}, courseId={}", userId, courseId);
    }

    /**
     * Request learning-service to add a user to a class as member.
     * routingKey = "classmember.create"
     */
    public void publishClassMemberCreate(Long userId, Long classId, String role, Long requestedBy) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", userId);
        payload.put("classId", classId);
        payload.put("role", role);
        if (requestedBy != null) payload.put("requestedBy", requestedBy);

        Map<String, Object> event = new HashMap<>();
        event.put("type", "classmember.create");
        event.put("payload", payload);
        event.put("timestamp", Instant.now().toString());
        event.put("userId", userId);

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE_NAME,
            RabbitMQConfig.CLASSMEMBER_CREATE_ROUTING_KEY,
            event
        );

        log.info("Published classmember.create event: userId={}, classId={}", userId, classId);
    }
}

