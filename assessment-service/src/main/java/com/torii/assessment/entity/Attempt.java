package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "attempts", schema = "assessment")
@Data
public class Attempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "assessment_id")
    private Long assessmentId;
    
    @Column(name = "user_id")
    private Integer userId;
    
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    private Double score;
    
    @Column(name = "level_suggestion")
    private String levelSuggestion;
    
    @Column(name = "earned_score")
    private Double earnedScore;
}
