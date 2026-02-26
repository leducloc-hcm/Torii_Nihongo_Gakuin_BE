package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "questions", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uuid")
    private String uuid;

    @Column(name = "version")
    @Builder.Default
    private Integer version = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private QuestionType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    private JLPTLevel level;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty")
    @Builder.Default
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(name = "stem", nullable = false, length = 2000)
    private String stem;

    @Column(name = "passage", length = 5000)
    private String passage;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "explanation", length = 2000)
    private String explanation;

    @Enumerated(EnumType.STRING)
    @Column(name = "reading_length")
    private ReadingLength readingLength;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Option> options = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (uuid == null) {
            uuid = java.util.UUID.randomUUID().toString();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Enums
    public enum QuestionType {
        VOCAB, KANJI, GRAMMAR, SYNONYM, ORDER, READING, LISTENING
    }

    public enum JLPTLevel {
        N5, N4, N3, N2, N1
    }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }

    public enum ReadingLength {
        SHORT, MEDIUM, LONG
    }
}

