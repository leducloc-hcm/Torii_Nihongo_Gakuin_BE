package com.torii.assessment.controller;

import com.torii.assessment.entity.AssessmentLog;
import com.torii.assessment.repository.AssessmentLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Assessment audit log APIs")
public class AuditLogController {

    private final AssessmentLogRepository assessmentLogRepository;

    @GetMapping("/assessment/{assessmentId}")
    @Operation(summary = "Get audit logs for an assessment")
    public ResponseEntity<Map<String, Object>> getLogsByAssessment(
            @PathVariable Long assessmentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        PageRequest pageable = PageRequest.of(
                Math.max(page - 1, 0),
                Math.min(Math.max(limit, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AssessmentLog> logPage = assessmentLogRepository.findByAssessmentIdOrderByCreatedAtDesc(assessmentId, pageable);
        return ResponseEntity.ok(buildPageResponse(logPage, page, limit));
    }

    @GetMapping("/entity/{entityType}/{entityId}")
    @Operation(summary = "Get audit logs for a specific entity")
    public ResponseEntity<Map<String, Object>> getLogsByEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        PageRequest pageable = PageRequest.of(
                Math.max(page - 1, 0),
                Math.min(Math.max(limit, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AssessmentLog> logPage = assessmentLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable);
        return ResponseEntity.ok(buildPageResponse(logPage, page, limit));
    }

    private Map<String, Object> buildPageResponse(Page<AssessmentLog> logPage, int page, int limit) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("data", logPage.getContent());
        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("total", logPage.getTotalElements());
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("totalPages", logPage.getTotalPages());
        pagination.put("hasNext", logPage.hasNext());
        pagination.put("hasPrev", logPage.hasPrevious());
        result.put("pagination", pagination);
        return result;
    }
}
