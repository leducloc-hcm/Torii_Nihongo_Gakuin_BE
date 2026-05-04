package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "score_profiles", schema = "assessment")
@Data
public class ScoreProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Column(length = 10)
    private String level; // N5, N4, N3, N2, N1
    
    @Column(name = "max_total")
    private Integer maxTotal;
    
    @Column(name = "min_total_pass")
    private Integer minTotalPass;
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_by")
    private Integer createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ScoreProfileSection> sections = new ArrayList<>();

    @OneToMany(mappedBy = "scoreProfile", fetch = FetchType.LAZY)
    private List<Assessment> assessments = new ArrayList<>();
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
