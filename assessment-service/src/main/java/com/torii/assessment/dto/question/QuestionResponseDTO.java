package com.torii.assessment.dto.question;

import com.torii.assessment.entity.Question;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponseDTO {
    private Long id;
    private String uuid;
    private Integer version;
    private Question.QuestionType type;
    private Question.JLPTLevel level;
    private Question.Difficulty difficulty;
    private String stem;
    private String passage;
    private Long mediaId;
    private String explanation;
    private Question.ReadingLength readingLength;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<OptionDTO> options;
    private MediaDTO media;
    private Integer optionsCount;
    private Integer correctOptionsCount;
    private Boolean hasMedia;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OptionDTO {
        private Long id;
        private String content;
        private Boolean isCorrect;
        private Integer order;
        private Long mediaId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MediaDTO {
        private Long id;
        private String url;
        private String kind;
        private String caption;
    }
}

