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

    @Column(name = "uuid")
    private String uuid;

    @Column(name = "version")
    @Builder.Default
    private Integer version = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private QuestionGroupType type;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "passage", length = 5000)
    private String passage;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Column(name = "audio_url", length = 500)
    private String audioUrl;

    @Column(name = "\"order\"")
    private Integer order;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

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
        if (uuid == null) {
            uuid = java.util.UUID.randomUUID().toString();
        }
    }

    // Enum
    public enum QuestionGroupType {
        VOCAB, KANJI, GRAMMAR, CLOZE, READING_SHORT, READING_MEDIUM, READING_LONG, LISTENING
    }
}

