package com.torii.assessment.messaging;

import com.torii.assessment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
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
}

