package com.torii.assessment.dto.question;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionStatsDTO {
    private Long totalQuestions;
    private Map<String, Long> byType;
    private Map<String, Long> byLevel;
    private Map<String, Long> byDifficulty;
    private Long withMedia;
    private Long withoutMedia;
}

