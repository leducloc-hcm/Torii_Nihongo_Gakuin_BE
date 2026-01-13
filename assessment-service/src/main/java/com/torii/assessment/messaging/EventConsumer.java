package com.torii.assessment.messaging;

import com.torii.assessment.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventConsumer {
    
    @RabbitListener(queues = "assessment.course.enrolled")
    public void handleCourseEnrolled(Map<String, Object> event) {
        log.info("Received course.enrolled event: {}", event);
        // TODO: Handle course enrollment - gate assessment availability
        // Example: Unlock assessments for enrolled courses
    }
    
    @RabbitListener(queues = "assessment.payment.completed")
    public void handlePaymentCompleted(Map<String, Object> event) {
        log.info("Received payment.completed event: {}", event);
        // TODO: Handle payment completion - unlock tests
        // Example: Unlock premium assessments after payment
    }
}

