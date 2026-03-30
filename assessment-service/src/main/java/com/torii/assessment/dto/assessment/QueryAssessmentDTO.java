package com.torii.assessment.dto.assessment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueryAssessmentDTO {

    @Builder.Default
    private Integer page = 1;

    @Builder.Default
    private Integer limit = 20;

    private String level;   // N1, N2, N3, N4, N5

    private String type;    // TEST, EXAM, QUIZ, ASSIGNMENT

    private String visibility; // PRIVATE, UNLISTED, PUBLIC

    private Long classId;

    private Integer assignedToId;

    private Integer lessonId;

    private String keyword; // search in title

    @Builder.Default
    private String sortBy = "createdAt"; // createdAt | startAt | dueAt | id

    @Builder.Default
    private String sortOrder = "desc";
}
