package com.torii.assessment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.torii.assessment.dto.assessment.AssessmentDTO;
import com.torii.assessment.entity.AssessmentLog;
import com.torii.assessment.repository.AssessmentLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AssessmentLogRepository assessmentLogRepository;
    private final LearningUserLookupService learningUserLookupService;
    private final ObjectMapper objectMapper;

    public static final String ENTITY_ASSESSMENT = "ASSESSMENT";
    public static final String ENTITY_SECTION = "SECTION";
    public static final String ENTITY_ITEM = "ITEM";
    public static final String ENTITY_ASSESSMENT_QUESTION = "ASSESSMENT_QUESTION";
    public static final String ENTITY_ASSESSMENT_QUESTION_GROUP = "ASSESSMENT_QUESTION_GROUP";
    public static final String ENTITY_ASSESSMENT_OPTION = "ASSESSMENT_OPTION";
    public static final String ENTITY_QUESTION = "QUESTION";
    public static final String ENTITY_QUESTION_GROUP = "QUESTION_GROUP";
    public static final String ENTITY_OPTION = "OPTION";
    public static final String ENTITY_ITEM_LINK = "ITEM_LINK";

    public static final String ACTION_CREATE = "CREATE";
    public static final String ACTION_UPDATE = "UPDATE";
    public static final String ACTION_DELETE = "DELETE";
    public static final String ACTION_CLONE = "CLONE";
    public static final String ACTION_IMPORT = "IMPORT";
    public static final String ACTION_ADD = "ADD";
    public static final String ACTION_REMOVE = "REMOVE";
    public static final String ACTION_REORDER = "REORDER";
    public static final String ACTION_REPLACE = "REPLACE";
    public static final String ACTION_BULK_CREATE = "BULK_CREATE";

    /**
     * Log an audit event. Resolves user name from learning schema.
     */
    @Async
    public void logAction(Long assessmentId, String entityType, Long entityId,
                          String action, String fieldName,
                          Object oldValue, Object newValue,
                          Integer updatedBy, String changeSummary,
                          Map<String, Object> metadata) {
        try {
            String userName = resolveUserName(updatedBy);

            // Build enriched metadata with structured event info
            Map<String, Object> enrichedMeta = new LinkedHashMap<>();
            if (metadata != null) {
                enrichedMeta.putAll(metadata);
            }
            enrichedMeta.put("user", userName != null ? userName : "Unknown");
            enrichedMeta.put("userId", updatedBy);
            enrichedMeta.put("action", action);
            enrichedMeta.put("entityType", entityType);
            enrichedMeta.put("entityId", entityId);
            if (fieldName != null) {
                enrichedMeta.put("field", fieldName);
            }
            if (oldValue != null) {
                enrichedMeta.put("oldValue", truncate(oldValue.toString(), 500));
            }
            if (newValue != null) {
                enrichedMeta.put("newValue", truncate(newValue.toString(), 500));
            }

            String metadataJson = objectMapper.writeValueAsString(enrichedMeta);

            // Auto-generate readable summary if not provided
            String readableSummary = changeSummary;
            if (readableSummary == null || readableSummary.isBlank()) {
                String displayName = userName != null ? userName : "User #" + updatedBy;
                String entityLabel = entityType.toLowerCase().replace("_", " ");
                readableSummary = String.format("%s %s %s #%d",
                        displayName, action.toLowerCase(), entityLabel,
                        entityId != null ? entityId : 0);
            }

            AssessmentLog entry = AssessmentLog.builder()
                    .assessmentId(assessmentId)
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .fieldName(fieldName)
                    .oldValue(oldValue != null ? truncate(oldValue.toString(), 5000) : null)
                    .newValue(newValue != null ? truncate(newValue.toString(), 5000) : null)
                    .updatedBy(updatedBy)
                    .updatedByName(userName)
                    .changeSummary(truncate(readableSummary, 500))
                    .metadata(metadataJson)
                    .build();

            assessmentLogRepository.save(entry);
        } catch (Exception ex) {
            log.error("Failed to save audit log: entityType={}, entityId={}, action={}", entityType, entityId, action, ex);
        }
    }

    /**
     * Convenience: log a simple action (CREATE / DELETE / CLONE / IMPORT) without field-level change
     */
    public void logAction(Long assessmentId, String entityType, Long entityId,
                          String action, Integer updatedBy, String changeSummary) {
        logAction(assessmentId, entityType, entityId, action, null, null, null, updatedBy, changeSummary, null);
    }

    /**
     * Convenience: log action with metadata map
     */
    public void logAction(Long assessmentId, String entityType, Long entityId,
                          String action, Integer updatedBy, String changeSummary,
                          Map<String, Object> metadata) {
        logAction(assessmentId, entityType, entityId, action, null, null, null, updatedBy, changeSummary, metadata);
    }

    /**
     * Log field-level changes: compare old vs new and log only if different
     */
    public void logFieldChange(Long assessmentId, String entityType, Long entityId,
                               String fieldName, Object oldValue, Object newValue,
                               Integer updatedBy) {
        if (Objects.equals(
                oldValue != null ? oldValue.toString() : null,
                newValue != null ? newValue.toString() : null)) {
            return;
        }
        String summary = String.format("Updated %s.%s", entityType.toLowerCase().replace("_", " "), fieldName);
        logAction(assessmentId, entityType, entityId, ACTION_UPDATE, fieldName, oldValue, newValue, updatedBy, summary, null);
    }

    private String resolveUserName(Integer userId) {
        if (userId == null) return null;
        try {
            AssessmentDTO.CreatorInfoDTO creator = learningUserLookupService.getCreatorById(userId);
            return creator != null ? creator.getName() : null;
        } catch (Exception ex) {
            log.warn("Could not resolve user name for userId={}", userId, ex);
            return null;
        }
    }

    private String truncate(String value, int maxLen) {
        if (value == null) return null;
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }
}
