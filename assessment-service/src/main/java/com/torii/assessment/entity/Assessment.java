package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "assessments", schema = "assessment")
@Data
public class Assessment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String title;
    private String level; // N5, N4, N3, N2, N1
    private String type; // TEST, EXAM
    private String visibility; // PRIVATE, UNLISTED, PUBLIC
    
    @Column(name = "created_by")
    private Integer createdBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "score_profile_id")
    private Long scoreProfileId;
    
    private Integer version = 1;
}
