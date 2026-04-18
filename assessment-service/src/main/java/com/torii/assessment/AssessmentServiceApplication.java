package com.torii.assessment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AssessmentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AssessmentServiceApplication.class, args);
    }
}

