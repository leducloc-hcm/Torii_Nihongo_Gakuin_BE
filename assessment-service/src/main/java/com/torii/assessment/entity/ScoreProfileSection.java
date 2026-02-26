package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "score_profile_sections", schema = "assessment")
@Data
public class ScoreProfileSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "profile_id", insertable = false, updatable = false)
    private Long profileId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id", nullable = false)
    private ScoreProfile profile;
    
    @Column(nullable = false, length = 20)
    private String type; // VOCAB, GRAMMAR, READING, LISTENING
    
    @Column(nullable = false)
    private String title;
    
    @Column(name = "max_score", nullable = false)
    private Integer maxScore;
    
    @Column(precision = 5, scale = 2)
    private BigDecimal weight;
    
    @Column(name = "min_pass")
    private Integer minPass;
    
    @Column(name = "default_time_sec")
    private Integer defaultTimeSec;
}
