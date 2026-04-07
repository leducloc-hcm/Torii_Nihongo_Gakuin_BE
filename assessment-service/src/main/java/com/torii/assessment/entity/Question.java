package com.torii.assessment.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

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

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "question_type")
    private QuestionType type;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "level", nullable = false, columnDefinition = "jlpt_level")
    private JLPTLevel level;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "difficulty", columnDefinition = "difficulty")
    @Builder.Default
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Column(name = "stem", nullable = false, length = 2000)
    private String stem;

    @Column(name = "passage", length = 5000)
    private String passage;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

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

