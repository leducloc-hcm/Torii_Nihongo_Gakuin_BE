package com.torii.assessment.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {
    
    public static final String EXCHANGE_NAME = "torii.events";
    public static final String ATTEMPT_SUBMITTED_ROUTING_KEY = "attempt.submitted";
    public static final String ATTEMPT_GRADED_ROUTING_KEY = "attempt.graded";
    public static final String COURSE_ENROLLED_ROUTING_KEY = "course.enrolled";
    public static final String PAYMENT_COMPLETED_ROUTING_KEY = "payment.completed";
    public static final String PAYMENT_SEPAY_WEBHOOK_ROUTING_KEY = "payment.sepay.webhook";
    public static final String ENROLLMENT_CREATE_ROUTING_KEY = "enrollment.create";
    public static final String CLASSMEMBER_CREATE_ROUTING_KEY = "classmember.create";
    
    // Queue names
    public static final String COURSE_ENROLLED_QUEUE = "assessment.course.enrolled";
    public static final String PAYMENT_COMPLETED_QUEUE = "assessment.payment.completed";
    
    @Bean
    public TopicExchange eventExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }
    
    // Declare queues
    @Bean
    public Queue courseEnrolledQueue() {
        return new Queue(COURSE_ENROLLED_QUEUE, true);
    }
    
    @Bean
    public Queue paymentCompletedQueue() {
        return new Queue(PAYMENT_COMPLETED_QUEUE, true);
    }
    
    // Bind queues to exchange
    @Bean
    public Binding courseEnrolledBinding(Queue courseEnrolledQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(courseEnrolledQueue)
                .to(eventExchange)
                .with(COURSE_ENROLLED_ROUTING_KEY);
    }
    
    @Bean
    public Binding paymentCompletedBinding(Queue paymentCompletedQueue, TopicExchange eventExchange) {
        return BindingBuilder.bind(paymentCompletedQueue)
                .to(eventExchange)
                .with(PAYMENT_COMPLETED_ROUTING_KEY);
    }
    
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
    
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}

