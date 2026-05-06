package com.torii.assessment.service;

import com.torii.assessment.dto.attempt.AttemptReviewDetailDTO;
import com.torii.assessment.dto.attempt.AttemptedAssessmentListResponseDTO;
import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.entity.Assessment;
import com.torii.assessment.entity.AssessmentAnswer;
import com.torii.assessment.entity.AssessmentGroupQuestion;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentOption;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentSection;
import com.torii.assessment.entity.Attempt;
import com.torii.assessment.entity.ItemAssessmentGroup;
import com.torii.assessment.entity.ItemAssessmentQuestion;
import com.torii.assessment.entity.WrongAnswerMastery;
import com.torii.assessment.entity.AiGeneratedQuestion;
import com.torii.assessment.repository.AssessmentAnswerRepository;
import com.torii.assessment.repository.AssessmentGroupQuestionRepository;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentOptionRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.AssessmentRepository;
import com.torii.assessment.repository.AssessmentSectionRepository;
import com.torii.assessment.repository.AttemptRepository;
import com.torii.assessment.repository.ItemAssessmentGroupRepository;
import com.torii.assessment.repository.ItemAssessmentQuestionRepository;
import com.torii.assessment.repository.WrongAnswerMasteryRepository;
import com.torii.assessment.repository.AiGeneratedQuestionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttemptReviewService {

    private final AttemptRepository attemptRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentSectionRepository assessmentSectionRepository;
    private final AssessmentItemRepository assessmentItemRepository;
    private final ItemAssessmentQuestionRepository itemAssessmentQuestionRepository;
    private final ItemAssessmentGroupRepository itemAssessmentGroupRepository;
    private final AssessmentGroupQuestionRepository assessmentGroupQuestionRepository;
    private final AssessmentAnswerRepository assessmentAnswerRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentOptionRepository assessmentOptionRepository;
    private final LearningUserLookupService learningUserLookupService;
    private final WrongAnswerMasteryRepository wrongAnswerMasteryRepository;
    private final AiGeneratedQuestionRepository aiGeneratedQuestionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AttemptedAssessmentListResponseDTO getAttemptedAssessments(
        Integer userId,
        Assessment.AssessmentType type,
        Assessment.JLPTLevel level
    ) {
        List<Attempt> submittedAttempts = attemptRepository.findByUserIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(userId);
        return buildAttemptedListResponse(submittedAttempts, type, level);
    }

    public AttemptedAssessmentListResponseDTO getAttemptedAssessmentsForStudent(
        Integer studentId,
        Assessment.AssessmentType type,
        Assessment.JLPTLevel level,
        int page,
        int limit
    ) {
        List<Attempt> submittedAttempts = attemptRepository.findByUserIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(studentId);
        return buildAttemptedListResponsePaged(submittedAttempts, type, level, page, limit);
    }

    public AttemptReviewDetailDTO getAttemptDetail(Long attemptId, Integer requesterUserId, String requesterRole) {
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));
        ensureCanAccessAttempt(attempt, requesterUserId, requesterRole);
        return buildAttemptDetail(attempt);
    }

    public AttemptReviewDetailDTO getAttemptDetailForStudent(
        Integer studentId,
        Long attemptId,
        Integer requesterUserId,
        String requesterRole
    ) {
        ensureLecturerAccess(requesterRole);
        Attempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        if (!attempt.getUserId().equals(studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Attempt does not belong to the requested student");
        }

        return buildAttemptDetail(attempt);
    }

    public Map<String, Object> getAssessmentOverview(
        Long assessmentId,
        Integer page,
        Integer limit,
        String keyword,
        String sortBy,
        String sortOrder
    ) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + assessmentId));

        int safePage = page == null || page < 1 ? 1 : page;
        int safeLimit = limit == null || limit < 1 ? 20 : limit;

        List<Attempt> submittedAttempts = attemptRepository.findByAssessmentId(assessmentId)
            .stream()
            .filter(a -> a.getSubmittedAt() != null)
            .collect(Collectors.toList());

        Map<Integer, List<Attempt>> attemptsByStudent = submittedAttempts.stream()
            .collect(Collectors.groupingBy(Attempt::getUserId));

        List<Map<String, Object>> studentRows = attemptsByStudent.entrySet().stream()
            .map(entry -> {
                Integer studentId = entry.getKey();
                List<Attempt> attempts = entry.getValue();

                Double bestScore = attempts.stream()
                    .map(Attempt::getScore)
                    .filter(score -> score != null)
                    .max(Double::compareTo)
                    .orElse(null);

                LocalDateTime lastAttempt = attempts.stream()
                    .map(Attempt::getSubmittedAt)
                    .filter(ts -> ts != null)
                    .max(LocalDateTime::compareTo)
                    .orElse(null);

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("studentId", studentId);
                row.put("attempts", attempts.size());
                row.put("bestScore", bestScore);
                row.put("lastAttempt", lastAttempt);
                return row;
            })
            .collect(Collectors.toList());

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            studentRows = studentRows.stream()
                .filter(row -> String.valueOf(row.get("studentId")).toLowerCase().contains(kw))
                .collect(Collectors.toList());
        }

        String sortField = sortBy == null || sortBy.isBlank() ? "lastAttempt" : sortBy;
        boolean asc = "asc".equalsIgnoreCase(sortOrder);
        Comparator<Map<String, Object>> comparator;
        switch (sortField) {
            case "studentId" -> comparator = Comparator.comparing(row -> (Integer) row.get("studentId"));
            case "attempts" -> comparator = Comparator.comparing(row -> (Integer) row.get("attempts"));
            case "bestScore" -> comparator = Comparator.comparing(
                row -> (Double) row.get("bestScore"),
                Comparator.nullsLast(Double::compareTo)
            );
            default -> comparator = Comparator.comparing(
                row -> (LocalDateTime) row.get("lastAttempt"),
                Comparator.nullsLast(LocalDateTime::compareTo)
            );
        }

        if (!asc) {
            comparator = comparator.reversed();
        }
        studentRows.sort(comparator);

        int total = studentRows.size();
        int from = Math.min((safePage - 1) * safeLimit, total);
        int to = Math.min(from + safeLimit, total);
        List<Map<String, Object>> pagedRows = studentRows.subList(from, to);

        Map<String, Object> assessmentInfo = new LinkedHashMap<>();
        AssessmentDTO.CreatorInfoDTO creator = learningUserLookupService.getCreatorById(assessment.getCreatedBy());
        assessmentInfo.put("id", assessment.getId());
        assessmentInfo.put("title", assessment.getTitle());
        assessmentInfo.put("type", assessment.getType() != null ? assessment.getType().name() : null);
        assessmentInfo.put("level", assessment.getLevel() != null ? assessment.getLevel().name() : null);
        assessmentInfo.put("visibility", assessment.getVisibility() != null ? assessment.getVisibility().name() : null);
        assessmentInfo.put("createdBy", assessment.getCreatedBy());
        assessmentInfo.put("creator", creator);
        assessmentInfo.put("publishStatus", assessment.getVisibility() == Assessment.AssessmentVisibility.PUBLIC ? "PUBLISHED" : "DRAFT");

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", total);
        pagination.put("page", safePage);
        pagination.put("limit", safeLimit);
        pagination.put("totalPages", total == 0 ? 0 : (int) Math.ceil((double) total / safeLimit));
        pagination.put("hasNext", safePage * safeLimit < total);
        pagination.put("hasPrev", safePage > 1);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("assessment", assessmentInfo);
        response.put("totalStudents", attemptsByStudent.size());
        response.put("students", pagedRows);
        response.put("pagination", pagination);
        return response;
    }

    public Map<String, Object> getAssessmentStudentAttempts(
        Long assessmentId,
        Integer studentId,
        Integer page,
        Integer limit
    ) {
        if (!assessmentRepository.existsById(assessmentId)) {
            throw new RuntimeException("Assessment not found: " + assessmentId);
        }

        int safePage = page == null || page < 1 ? 1 : page;
        int safeLimit = limit == null || limit < 1 ? 20 : limit;

        List<Attempt> studentAttempts = attemptRepository.findByAssessmentId(assessmentId)
            .stream()
            .filter(a -> a.getUserId().equals(studentId))
            .sorted(Comparator.comparing(Attempt::getAttemptNo, Comparator.nullsLast(Integer::compareTo)).reversed())
            .collect(Collectors.toList());

        int total = studentAttempts.size();
        int from = Math.min((safePage - 1) * safeLimit, total);
        int to = Math.min(from + safeLimit, total);

        List<Map<String, Object>> attempts = studentAttempts.subList(from, to).stream().map(attempt -> {
            Integer timeSpentSec = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attempt.getId())
                .stream()
                .map(AssessmentAnswer::getTimeSpentSec)
                .filter(v -> v != null)
                .reduce(0, Integer::sum);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("attemptId", attempt.getId());
            row.put("attempt", attempt.getAttemptNo());
            row.put("score", attempt.getScore());
            row.put("earnedScore", attempt.getEarnedScore());
            row.put("timeSpentSec", timeSpentSec);
            row.put("status", attempt.getStatus() != null ? attempt.getStatus().name() : null);
            row.put("startedAt", attempt.getStartedAt());
            row.put("submittedAt", attempt.getSubmittedAt());
            return row;
        }).collect(Collectors.toList());

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", total);
        pagination.put("page", safePage);
        pagination.put("limit", safeLimit);
        pagination.put("totalPages", total == 0 ? 0 : (int) Math.ceil((double) total / safeLimit));
        pagination.put("hasNext", safePage * safeLimit < total);
        pagination.put("hasPrev", safePage > 1);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("assessmentId", assessmentId);
        response.put("studentId", studentId);
        response.put("attempts", attempts);
        response.put("pagination", pagination);
        return response;
    }

    public Map<String, Object> getWrongAnswerLab(
        Integer userId,
        Integer limitAttempts,
        Integer maxQuestionsPerDrill,
        Boolean includeListening,
        List<String> sourceTypes
    ) {
        int safeLimitAttempts = limitAttempts == null || limitAttempts < 1 ? 20 : Math.min(limitAttempts, 100);
        int safeMaxQuestions = maxQuestionsPerDrill == null || maxQuestionsPerDrill < 1
            ? 8
            : Math.min(maxQuestionsPerDrill, 30);
        boolean allowListening = Boolean.TRUE.equals(includeListening);

        Set<String> allowedTypes = sourceTypes == null || sourceTypes.isEmpty()
            ? Set.of("TEST", "EXAM", "QUIZ", "ASSIGNMENT")
            : sourceTypes.stream().map(String::toUpperCase).collect(Collectors.toSet());

        List<Attempt> submittedAttempts = attemptRepository.findByUserIdAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(userId);
        List<Attempt> slicedAttempts = submittedAttempts.size() > safeLimitAttempts
            ? submittedAttempts.subList(0, safeLimitAttempts)
            : submittedAttempts;

        Map<Long, Assessment> assessmentMap = assessmentRepository.findAllById(
            slicedAttempts.stream().map(Attempt::getAssessmentId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Assessment::getId, a -> a));

        Map<Long, Map<String, Object>> uniqueWrongQuestions = new LinkedHashMap<>();
        Map<String, Integer> sourceTypeCounts = new LinkedHashMap<>();

        for (Attempt attempt : slicedAttempts) {
            Assessment assessment = assessmentMap.get(attempt.getAssessmentId());
            if (assessment == null || assessment.getType() == null) {
                continue;
            }

            String sourceType = assessment.getType().name();
            if (!allowedTypes.contains(sourceType)) {
                continue;
            }

            AttemptReviewDetailDTO detail = buildAttemptDetail(attempt);
            for (AttemptReviewDetailDTO.SectionDetailDTO section : detail.getSectionDetails()) {
                String sectionType = section.getSectionType();
                if (!allowListening && "LISTENING".equalsIgnoreCase(sectionType)) {
                    continue;
                }

                for (AttemptReviewDetailDTO.QuestionResultDTO question : section.getQuestions()) {
                    if (Boolean.TRUE.equals(question.getIsCorrect())) {
                        continue;
                    }

                    Long questionId = question.getQuestionId();
                    if (questionId == null || uniqueWrongQuestions.containsKey(questionId)) {
                        continue;
                    }

                    List<Map<String, Object>> options = question.getOptions() == null
                        ? Collections.emptyList()
                        : question.getOptions().stream().map(o -> {
                            Map<String, Object> optionMap = new LinkedHashMap<>();
                            optionMap.put("id", o.getId());
                            optionMap.put("content", o.getContent());
                            optionMap.put("order", o.getOrder());
                            return optionMap;
                        }).collect(Collectors.toList());

                    Map<String, Object> payload = new LinkedHashMap<>();
                    payload.put("questionId", questionId);
                    payload.put("stem", question.getStem());
                    payload.put("sectionType", sectionType);
                    payload.put("focus", mapSectionTypeToFocus(sectionType));
                    payload.put("assessmentType", sourceType);
                    payload.put("assessmentId", detail.getAssessmentId());
                    payload.put("assessmentTitle", detail.getAssessmentTitle());
                    payload.put("attemptId", detail.getAttemptId());
                    payload.put("selectedOptionId", question.getSelectedOptionId());
                    payload.put("options", options);
                    uniqueWrongQuestions.put(questionId, payload);

                    sourceTypeCounts.put(sourceType, sourceTypeCounts.getOrDefault(sourceType, 0) + 1);
                }
            }
        }

        // Exclude mastered questions (previously answered correctly in drill mode)
        Set<Long> masteredQuestionIds = wrongAnswerMasteryRepository.findByUserId(userId)
            .stream()
            .map(WrongAnswerMastery::getQuestionId)
            .collect(Collectors.toSet());
        uniqueWrongQuestions.keySet().removeAll(masteredQuestionIds);

        // Group by assessmentId → sectionType
        Map<Long, Map<String, List<Map<String, Object>>>> groupedByAssessmentAndSection = new LinkedHashMap<>();
        Map<Long, Map<String, Object>> assessmentMeta = new LinkedHashMap<>();

        for (Map<String, Object> question : uniqueWrongQuestions.values()) {
            Long assessmentId = (Long) question.get("assessmentId");
            String sectionType = String.valueOf(question.get("sectionType"));

            groupedByAssessmentAndSection
                .computeIfAbsent(assessmentId, k -> new LinkedHashMap<>())
                .computeIfAbsent(sectionType, k -> new ArrayList<>())
                .add(question);

            assessmentMeta.putIfAbsent(assessmentId, Map.of(
                "assessmentTitle", question.getOrDefault("assessmentTitle", ""),
                "assessmentType", question.getOrDefault("assessmentType", "")
            ));
        }

        // Build assessment-grouped response
        List<Map<String, Object>> assessments = new ArrayList<>();
        for (Map.Entry<Long, Map<String, List<Map<String, Object>>>> assessmentEntry : groupedByAssessmentAndSection.entrySet()) {
            Long assessmentId = assessmentEntry.getKey();
            Map<String, List<Map<String, Object>>> sectionMap = assessmentEntry.getValue();
            Map<String, Object> meta = assessmentMeta.getOrDefault(assessmentId, Map.of());

            Assessment assessment = assessmentMap.get(assessmentId);
            String level = assessment != null && assessment.getLevel() != null ? assessment.getLevel().name() : null;

            List<Map<String, Object>> sections = new ArrayList<>();
            int totalUnresolved = 0;

            for (Map.Entry<String, List<Map<String, Object>>> sectionEntry : sectionMap.entrySet()) {
                String sectionType = sectionEntry.getKey();
                List<Map<String, Object>> questions = sectionEntry.getValue();
                totalUnresolved += questions.size();

                Map<String, Object> sectionData = new LinkedHashMap<>();
                sectionData.put("sectionType", sectionType);
                sectionData.put("questionCount", questions.size());
                sectionData.put("questions", questions);
                sections.add(sectionData);
            }

            Map<String, Object> assessmentData = new LinkedHashMap<>();
            assessmentData.put("assessmentId", assessmentId);
            assessmentData.put("assessmentTitle", meta.getOrDefault("assessmentTitle", ""));
            assessmentData.put("type", meta.getOrDefault("assessmentType", ""));
            assessmentData.put("level", level);
            assessmentData.put("unresolvedCount", totalUnresolved);
            assessmentData.put("sections", sections);
            assessments.add(assessmentData);
        }

        // Sort by unresolvedCount descending
        assessments.sort((a, b) -> Integer.compare(
            (Integer) b.get("unresolvedCount"), (Integer) a.get("unresolvedCount")
        ));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("attemptsAnalyzed", slicedAttempts.size());
        summary.put("totalWrongQuestions", uniqueWrongQuestions.size());
        summary.put("assessmentCount", assessments.size());
        summary.put("sourceTypeCounts", sourceTypeCounts);
        summary.put("includeListening", allowListening);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("assessments", assessments);
        return response;
    }

    public Map<String, Object> gradeWrongAnswerLab(Integer userId, List<com.torii.assessment.dto.attempt.WrongAnswerLabGradeRequestDTO.AnswerDTO> answers) {
        if (answers == null || answers.isEmpty()) {
            return Map.of(
                "total", 0,
                "correct", 0,
                "accuracy", 0,
                "results", List.of()
            );
        }

        List<Map<String, Object>> results = new ArrayList<>();
        int correctCount = 0;
        List<Long> newlyMasteredIds = new ArrayList<>();

        for (com.torii.assessment.dto.attempt.WrongAnswerLabGradeRequestDTO.AnswerDTO answer : answers) {
            Long questionId = answer.getQuestionId();
            Long selectedOptionId = answer.getSelectedOptionId();

            Long correctOptionId = assessmentOptionRepository.findByQuestionIdOrderByOrderAsc(questionId)
                .stream()
                .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                .map(AssessmentOption::getId)
                .findFirst()
                .orElse(null);

            boolean isCorrect = correctOptionId != null && correctOptionId.equals(selectedOptionId);
            if (isCorrect) {
                correctCount++;
                newlyMasteredIds.add(questionId);
            }

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("questionId", questionId);
            item.put("selectedOptionId", selectedOptionId);
            item.put("correctOptionId", correctOptionId);
            item.put("isCorrect", isCorrect);
            results.add(item);
        }

        // Save mastered questions (answered correctly in drill mode)
        if (userId != null && !newlyMasteredIds.isEmpty()) {
            for (Long questionId : newlyMasteredIds) {
                try {
                    if (!wrongAnswerMasteryRepository.existsByUserIdAndQuestionId(userId, questionId)) {
                        wrongAnswerMasteryRepository.save(WrongAnswerMastery.builder()
                            .userId(userId)
                            .questionId(questionId)
                            .build());
                    }
                } catch (Exception ignored) {
                    // Unique constraint may fire on race condition - safe to ignore
                }
            }
        }

        int total = answers.size();
        double accuracy = total == 0 ? 0d : (correctCount * 100.0) / total;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("total", total);
        payload.put("correct", correctCount);
        payload.put("accuracy", Math.round(accuracy * 10.0) / 10.0);
        payload.put("mastered", newlyMasteredIds.size());
        payload.put("results", results);
        return payload;
    }

    public Map<String, Object> saveAiGeneratedQuestion(
        Integer userIdInt, Long assessmentId, Long sourceQuestionId,
        String sectionType, String stem, String optionsJson,
        String correctAnswer, String explanation
    ) {
        Long userId = userIdInt.longValue();
        AiGeneratedQuestion entity = AiGeneratedQuestion.builder()
            .userId(userId)
            .sourceQuestionId(sourceQuestionId)
            .assessmentId(assessmentId)
            .sectionType(sectionType)
            .stem(stem)
            .options(optionsJson)
            .correctAnswer(correctAnswer)
            .explanation(explanation)
            .isResolved(false)
            .build();
        AiGeneratedQuestion saved = aiGeneratedQuestionRepository.save(entity);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", saved.getId());
        result.put("sourceQuestionId", saved.getSourceQuestionId());
        result.put("assessmentId", saved.getAssessmentId());
        result.put("sectionType", saved.getSectionType());
        result.put("stem", saved.getStem());
        result.put("correctAnswer", saved.getCorrectAnswer());
        return result;
    }

    public List<Map<String, Object>> getAiQuestionsForAssessment(Integer userId, Long assessmentId) {
        List<AiGeneratedQuestion> questions = aiGeneratedQuestionRepository
            .findByUserIdAndAssessmentIdAndIsResolvedFalse(userId.longValue(), assessmentId);
        return questions.stream().map(this::mapAiQuestion).collect(Collectors.toList());
    }

    public Map<String, Object> gradeAiQuestion(Integer userIdParam, Long aiQuestionId, String selectedAnswer) {
        AiGeneratedQuestion question = aiGeneratedQuestionRepository.findById(aiQuestionId)
            .orElseThrow(() -> new RuntimeException("AI question not found: " + aiQuestionId));

        if (!question.getUserId().equals(userIdParam.longValue())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot grade another user's AI question");
        }

        boolean isCorrect = question.getCorrectAnswer().equalsIgnoreCase(selectedAnswer.trim());

        if (isCorrect) {
            question.setIsResolved(true);
            aiGeneratedQuestionRepository.save(question);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("aiQuestionId", aiQuestionId);
        result.put("isCorrect", isCorrect);
        result.put("correctAnswer", question.getCorrectAnswer());
        result.put("explanation", question.getExplanation());
        result.put("isResolved", question.getIsResolved());
        return result;
    }

    private Map<String, Object> mapAiQuestion(AiGeneratedQuestion q) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", q.getId());
        map.put("sourceQuestionId", q.getSourceQuestionId());
        map.put("assessmentId", q.getAssessmentId());
        map.put("sectionType", q.getSectionType());
        map.put("stem", q.getStem());
        map.put("correctAnswer", q.getCorrectAnswer());
        map.put("explanation", q.getExplanation());
        map.put("isResolved", q.getIsResolved());
        try {
            map.put("options", objectMapper.readValue(q.getOptions(), new TypeReference<List<Map<String, Object>>>() {}));
        } catch (Exception e) {
            map.put("options", List.of());
        }
        return map;
    }

    private String mapSectionTypeToFocus(String sectionType) {
        String normalized = sectionType == null ? "" : sectionType.toUpperCase();
        if (normalized.contains("VOCAB") || normalized.contains("KANJI")) {
            return "VOCAB";
        }
        if (normalized.contains("GRAMMAR")) {
            return "GRAMMAR";
        }
        if (normalized.contains("READING")) {
            return "READING";
        }
        return "READING";
    }

    private AttemptedAssessmentListResponseDTO buildAttemptedListResponse(
        List<Attempt> submittedAttempts,
        Assessment.AssessmentType type,
        Assessment.JLPTLevel level
    ) {
        List<Long> assessmentIds = submittedAttempts.stream()
            .map(Attempt::getAssessmentId)
            .distinct()
            .collect(Collectors.toList());

        Map<Long, Assessment> assessmentMap = assessmentRepository.findAllById(assessmentIds)
            .stream()
            .collect(Collectors.toMap(Assessment::getId, a -> a));

        List<Attempt> filteredAttempts = submittedAttempts.stream()
            .filter(attempt -> {
                Assessment assessment = assessmentMap.get(attempt.getAssessmentId());
                if (assessment == null) {
                    return false;
                }
                if (type != null && assessment.getType() != type) {
                    return false;
                }
                if (level != null && assessment.getLevel() != level) {
                    return false;
                }
                return true;
            })
            .collect(Collectors.toList());

        List<AttemptedAssessmentListResponseDTO.AttemptedAssessmentDTO> data = filteredAttempts
            .stream()
            .map(attempt -> buildAttemptedSummary(attempt, assessmentMap.get(attempt.getAssessmentId())))
            .collect(Collectors.toList());

        return AttemptedAssessmentListResponseDTO.builder()
            .data(data)
            .pagination(null)
            .build();
    }

    private AttemptedAssessmentListResponseDTO buildAttemptedListResponsePaged(
        List<Attempt> submittedAttempts,
        Assessment.AssessmentType type,
        Assessment.JLPTLevel level,
        int page,
        int limit
    ) {
        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(limit, 1);

        List<Long> assessmentIds = submittedAttempts.stream()
            .map(Attempt::getAssessmentId)
            .distinct()
            .collect(Collectors.toList());

        Map<Long, Assessment> assessmentMap = assessmentRepository.findAllById(assessmentIds)
            .stream()
            .collect(Collectors.toMap(Assessment::getId, a -> a));

        List<Attempt> filteredAttempts = submittedAttempts.stream()
            .filter(attempt -> {
                Assessment assessment = assessmentMap.get(attempt.getAssessmentId());
                if (assessment == null) {
                    return false;
                }
                if (type != null && assessment.getType() != type) {
                    return false;
                }
                if (level != null && assessment.getLevel() != level) {
                    return false;
                }
                return true;
            })
            .collect(Collectors.toList());

        int total = filteredAttempts.size();
        int fromIndex = Math.min((safePage - 1) * safeLimit, total);
        int toIndex = Math.min(fromIndex + safeLimit, total);

        List<AttemptedAssessmentListResponseDTO.AttemptedAssessmentDTO> data = filteredAttempts.subList(fromIndex, toIndex)
            .stream()
            .map(attempt -> buildAttemptedSummary(attempt, assessmentMap.get(attempt.getAssessmentId())))
            .collect(Collectors.toList());

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeLimit);

        return AttemptedAssessmentListResponseDTO.builder()
            .data(data)
            .pagination(AttemptedAssessmentListResponseDTO.PaginationDTO.builder()
                .total(total)
                .page(safePage)
                .limit(safeLimit)
                .totalPages(totalPages)
                .hasNext(safePage * safeLimit < total)
                .hasPrev(safePage > 1)
                .build())
            .build();
    }

    private AttemptedAssessmentListResponseDTO.AttemptedAssessmentDTO buildAttemptedSummary(Attempt attempt, Assessment assessment) {
        AssessmentStructureSnapshot snapshot = buildStructureSnapshot(assessment.getId(), false);
        Map<Long, AssessmentAnswer> answerByQuestionId = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attempt.getId())
            .stream()
            .collect(Collectors.toMap(AssessmentAnswer::getQuestionId, a -> a, (first, second) -> second));

        int totalQuestions = 0;
        int correctAnswers = 0;
        List<AttemptedAssessmentListResponseDTO.SectionScoreDTO> sectionScores = new ArrayList<>();

        for (SectionSnapshot section : snapshot.sections) {
            int sectionTotal = section.questionIds.size();
            int sectionCorrect = 0;
            double sectionEarned = 0d;
            double sectionFull = section.questionPoints.values().stream().mapToDouble(Double::doubleValue).sum();

            for (Long questionId : section.questionIds) {
                AssessmentAnswer answer = answerByQuestionId.get(questionId);
                if (answer != null && Boolean.TRUE.equals(answer.getIsCorrect())) {
                    sectionCorrect++;
                    sectionEarned += section.questionPoints.getOrDefault(questionId, 0d);
                }
            }

            totalQuestions += sectionTotal;
            correctAnswers += sectionCorrect;

            sectionScores.add(AttemptedAssessmentListResponseDTO.SectionScoreDTO.builder()
                .sectionId(section.sectionId)
                .sectionTitle(section.sectionTitle)
                .sectionType(section.sectionType)
                .totalQuestions(sectionTotal)
                .correctAnswers(sectionCorrect)
                .earnedScore(sectionEarned)
                .fullScore(sectionFull)
                .build());
        }

        double fullScore = sectionScores.stream().mapToDouble(AttemptedAssessmentListResponseDTO.SectionScoreDTO::getFullScore).sum();

        return AttemptedAssessmentListResponseDTO.AttemptedAssessmentDTO.builder()
            .assessmentId(assessment.getId())
            .title(assessment.getTitle())
            .type(assessment.getType() != null ? assessment.getType().name() : null)
            .level(assessment.getLevel() != null ? assessment.getLevel().name() : null)
            .attemptId(attempt.getId())
            .attemptNo(attempt.getAttemptNo())
            .submittedAt(attempt.getSubmittedAt())
            .score(attempt.getScore())
            .earnedScore(attempt.getEarnedScore())
            .fullScore(fullScore)
            .totalQuestions(totalQuestions)
            .correctAnswers(correctAnswers)
            .sectionScores(sectionScores)
            .build();
    }

    private AttemptReviewDetailDTO buildAttemptDetail(Attempt attempt) {
        Assessment assessment = assessmentRepository.findById(attempt.getAssessmentId())
            .orElseThrow(() -> new RuntimeException("Assessment not found: " + attempt.getAssessmentId()));

        AssessmentStructureSnapshot snapshot = buildStructureSnapshot(assessment.getId(), true);

        List<AssessmentAnswer> answers = assessmentAnswerRepository.findByAttemptIdOrderByIdAsc(attempt.getId());
        Map<Long, AssessmentAnswer> answerByQuestionId = answers.stream()
            .collect(Collectors.toMap(AssessmentAnswer::getQuestionId, a -> a, (first, second) -> second));

        int totalQuestions = 0;
        int correctAnswers = 0;
        List<AttemptReviewDetailDTO.SectionDetailDTO> sectionDetails = new ArrayList<>();

        for (SectionSnapshot section : snapshot.sections) {
            int sectionTotal = section.questionIds.size();
            int sectionCorrect = 0;
            double sectionEarned = 0d;
            double sectionFull = section.questionPoints.values().stream().mapToDouble(Double::doubleValue).sum();
            List<AttemptReviewDetailDTO.QuestionResultDTO> questions = new ArrayList<>();

            for (Long questionId : section.questionIds) {
                AssessmentQuestion question = snapshot.questionMap.get(questionId);
                AssessmentAnswer answer = answerByQuestionId.get(questionId);
                List<AssessmentOption> options = snapshot.optionMap.getOrDefault(questionId, List.of());
                Long correctOptionId = options.stream()
                    .filter(o -> Boolean.TRUE.equals(o.getIsCorrect()))
                    .map(AssessmentOption::getId)
                    .findFirst()
                    .orElse(null);

                if (answer != null && Boolean.TRUE.equals(answer.getIsCorrect())) {
                    sectionCorrect++;
                    sectionEarned += section.questionPoints.getOrDefault(questionId, 0d);
                }

                questions.add(AttemptReviewDetailDTO.QuestionResultDTO.builder()
                    .questionId(questionId)
                    .stem(question != null ? question.getStem() : null)
                    .explanation(resolveExplanation(question, answer))
                    .isCorrect(answer != null ? answer.getIsCorrect() : null)
                    .selectedOptionId(answer != null ? answer.getSelectedOptionId() : null)
                    .correctOptionId(correctOptionId)
                    .timeSpentSec(answer != null ? answer.getTimeSpentSec() : null)
                    .options(options.stream().map(o -> AttemptReviewDetailDTO.OptionResultDTO.builder()
                        .id(o.getId())
                        .content(o.getContent())
                        .isCorrect(o.getIsCorrect())
                        .order(o.getOrder())
                        .build()).collect(Collectors.toList()))
                    .build());
            }

            totalQuestions += sectionTotal;
            correctAnswers += sectionCorrect;

            sectionDetails.add(AttemptReviewDetailDTO.SectionDetailDTO.builder()
                .sectionId(section.sectionId)
                .sectionTitle(section.sectionTitle)
                .sectionType(section.sectionType)
                .totalQuestions(sectionTotal)
                .correctAnswers(sectionCorrect)
                .earnedScore(sectionEarned)
                .fullScore(sectionFull)
                .questions(questions)
                .build());
        }

        double fullScore = sectionDetails.stream().mapToDouble(AttemptReviewDetailDTO.SectionDetailDTO::getFullScore).sum();

        return AttemptReviewDetailDTO.builder()
            .attemptId(attempt.getId())
            .attemptNo(attempt.getAttemptNo())
            .userId(attempt.getUserId())
            .assessmentId(assessment.getId())
            .assessmentTitle(assessment.getTitle())
            .type(assessment.getType() != null ? assessment.getType().name() : null)
            .level(assessment.getLevel() != null ? assessment.getLevel().name() : null)
            .startedAt(attempt.getStartedAt())
            .submittedAt(attempt.getSubmittedAt())
            .score(attempt.getScore())
            .earnedScore(attempt.getEarnedScore())
            .fullScore(fullScore)
            .totalQuestions(totalQuestions)
            .correctAnswers(correctAnswers)
            .sectionDetails(sectionDetails)
            .build();
    }

    private String resolveExplanation(AssessmentQuestion question, AssessmentAnswer answer) {
        if (question != null && question.getExplanation() != null && !question.getExplanation().isBlank()) {
            return question.getExplanation();
        }

        if (answer != null && answer.getExplanation() != null && !answer.getExplanation().isBlank()) {
            return answer.getExplanation();
        }

        return null;
    }

    private AssessmentStructureSnapshot buildStructureSnapshot(Long assessmentId, boolean includeQuestionData) {
        List<AssessmentSection> sections = assessmentSectionRepository.findByAssessmentId(assessmentId);
        sections.sort(Comparator.comparing(AssessmentSection::getOrder, Comparator.nullsLast(Integer::compareTo)));

        List<SectionSnapshot> sectionSnapshots = new ArrayList<>();
        Set<Long> allQuestionIds = new LinkedHashSet<>();

        for (AssessmentSection section : sections) {
            List<AssessmentItem> items = assessmentItemRepository.findBySectionIdOrderByOrderAsc(section.getId());
            Set<Long> questionIds = new LinkedHashSet<>();
            Map<Long, Double> questionPoints = new LinkedHashMap<>();

            for (AssessmentItem item : items) {
                double scorePerQuestion = item.getScorePerQuestion() != null
                    ? item.getScorePerQuestion().doubleValue()
                    : BigDecimal.ZERO.doubleValue();

                List<ItemAssessmentQuestion> questionLinks = itemAssessmentQuestionRepository.findByItemIdOrderByOrderAsc(item.getId());
                for (ItemAssessmentQuestion questionLink : questionLinks) {
                    Long questionId = questionLink.getQuestionId();
                    questionIds.add(questionId);
                    questionPoints.putIfAbsent(questionId, scorePerQuestion);
                }

                List<ItemAssessmentGroup> groupLinks = itemAssessmentGroupRepository.findByItemIdOrderByOrderAsc(item.getId());
                for (ItemAssessmentGroup groupLink : groupLinks) {
                    List<AssessmentGroupQuestion> groupQuestions =
                        assessmentGroupQuestionRepository.findByGroupIdOrderByOrderAsc(groupLink.getGroupId());
                    for (AssessmentGroupQuestion groupQuestion : groupQuestions) {
                        Long questionId = groupQuestion.getQuestionId();
                        questionIds.add(questionId);
                        questionPoints.putIfAbsent(questionId, scorePerQuestion);
                    }
                }
            }

            allQuestionIds.addAll(questionIds);
            sectionSnapshots.add(new SectionSnapshot(
                section.getId(),
                section.getTitle(),
                section.getType() != null ? section.getType().name() : null,
                new ArrayList<>(questionIds),
                questionPoints
            ));
        }

        Map<Long, AssessmentQuestion> questionMap = new HashMap<>();
        Map<Long, List<AssessmentOption>> optionMap = new HashMap<>();

        if (includeQuestionData && !allQuestionIds.isEmpty()) {
            questionMap = assessmentQuestionRepository.findAllById(allQuestionIds)
                .stream()
                .collect(Collectors.toMap(AssessmentQuestion::getId, q -> q));

            for (Long questionId : allQuestionIds) {
                optionMap.put(questionId, assessmentOptionRepository.findByQuestionIdOrderByOrderAsc(questionId));
            }
        }

        return new AssessmentStructureSnapshot(sectionSnapshots, questionMap, optionMap);
    }

    private void ensureCanAccessAttempt(Attempt attempt, Integer requesterUserId, String requesterRole) {
        boolean privileged = "STAFF".equalsIgnoreCase(requesterRole)
            || "LECTURER".equalsIgnoreCase(requesterRole)
            || "ADMIN".equalsIgnoreCase(requesterRole);

        if (!privileged && !attempt.getUserId().equals(requesterUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "CUSTOMER can only access their own attempts");
        }
    }

    private void ensureLecturerAccess(String requesterRole) {
        boolean privileged = "STAFF".equalsIgnoreCase(requesterRole)
            || "LECTURER".equalsIgnoreCase(requesterRole)
            || "ADMIN".equalsIgnoreCase(requesterRole);

        if (!privileged) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Only STAFF, LECTURER, ADMIN can review student attempts");
        }
    }

    private static class AssessmentStructureSnapshot {
        private final List<SectionSnapshot> sections;
        private final Map<Long, AssessmentQuestion> questionMap;
        private final Map<Long, List<AssessmentOption>> optionMap;

        private AssessmentStructureSnapshot(
            List<SectionSnapshot> sections,
            Map<Long, AssessmentQuestion> questionMap,
            Map<Long, List<AssessmentOption>> optionMap
        ) {
            this.sections = sections;
            this.questionMap = questionMap;
            this.optionMap = optionMap;
        }
    }

    private static class SectionSnapshot {
        private final Long sectionId;
        private final String sectionTitle;
        private final String sectionType;
        private final List<Long> questionIds;
        private final Map<Long, Double> questionPoints;

        private SectionSnapshot(
            Long sectionId,
            String sectionTitle,
            String sectionType,
            List<Long> questionIds,
            Map<Long, Double> questionPoints
        ) {
            this.sectionId = sectionId;
            this.sectionTitle = sectionTitle;
            this.sectionType = sectionType;
            this.questionIds = questionIds;
            this.questionPoints = questionPoints;
        }
    }
}
