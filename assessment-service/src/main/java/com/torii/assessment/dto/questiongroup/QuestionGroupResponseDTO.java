package com.torii.assessment.dto.questiongroup;

import com.torii.assessment.entity.QuestionGroup;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionGroupResponseDTO {
    private Long id;
    private String uuid;
    private Integer version;
    private QuestionGroup.QuestionGroupType type;
    private String title;
    private String passage;
    private Long mediaId;
    private String mediaUrl;
    private String audioUrl;
    private Integer order;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private List<QuestionDTO> questions;
    private MediaDTO media;
    private Integer questionsCount;
    private Boolean hasMedia;
    private Boolean hasPassage;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionDTO {
        private Long id;
        private String stem;
        private String type;
        private String level;
        private String difficulty;
        private Integer order;
        private Double score;
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

