package com.torii.assessment.payment;

import com.torii.assessment.messaging.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentWebhookController {

    private final EventPublisher eventPublisher;

    /**
     * SePay webhook endpoint (moved from learning-service).
     * This service receives the webhook and forwards it to learning-service via RabbitMQ.
     */
    @PostMapping("/sepay/webhook")
    public ResponseEntity<Map<String, Object>> sepayWebhook(@RequestBody Map<String, Object> webhookPayload) {
        log.info("Received SePay webhook (assessment-service): {}", webhookPayload);

        eventPublisher.publishSepayWebhook(webhookPayload);

        // Always 200 OK so the provider doesn't keep retrying aggressively.
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Webhook received and queued for processing"
        ));
    }
}

