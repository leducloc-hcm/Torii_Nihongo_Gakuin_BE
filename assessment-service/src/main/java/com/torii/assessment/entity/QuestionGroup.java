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
@Table(name = "question_groups", schema = "assessment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false, columnDefinition = "question_group_type")
    private QuestionGroupType type;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "level", columnDefinition = "jlpt_level")
    private Question.JLPTLevel level;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "difficulty", columnDefinition = "difficulty")
    private Question.Difficulty difficulty;

    @Column(name = "stem", columnDefinition = "text")
    private String stem;

    @Column(name = "passage", length = 5000)
    private String passage;

    @Column(name = "explanation", columnDefinition = "text")
    private String explanation;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "questionGroup", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<QuestionGroupQuestion> questions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // Enum
    public enum QuestionGroupType {
        VOCAB, KANJI, GRAMMAR, CLOZE, READING_SHORT, READING_MEDIUM, READING_LONG, LISTENING
    }
}

