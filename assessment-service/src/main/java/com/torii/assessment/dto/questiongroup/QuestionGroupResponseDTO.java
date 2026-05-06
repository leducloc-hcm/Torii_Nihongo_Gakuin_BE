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
    private Long questionGroupId;
    private QuestionGroup.QuestionGroupType type;
    private String level;
    private String difficulty;
    private String stem;
    private String passage;
    private String explanation;
    private String mediaUrl;
    private String audioUrl;
    private LocalDateTime createdAt;
    private List<Long> questionIds;
    private List<QuestionDTO> questions;
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
        private List<OptionDTO> options;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OptionDTO {
        private Long id;
        private String content;
        private Boolean isCorrect;
        private Integer order;
        private String mediaUrl;
    }

}

