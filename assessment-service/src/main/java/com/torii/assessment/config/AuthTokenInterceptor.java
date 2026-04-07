package com.torii.assessment.config;

import com.torii.assessment.util.RequestAuthUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.Set;

@Component
public class AuthTokenInterceptor implements HandlerInterceptor {

    private static final Set<String> WRITE_ROLES = Set.of("STAFF", "LECTURER", "ADMIN");

    // Admin/content-management endpoints: write actions require elevated roles.
    private static final List<String> WRITE_RESTRICTED_PREFIXES = List.of(
            "/assessment",
            "/assessment-sections",
            "/assessment-items",
            "/assessment-questions",
            "/assessment-question-groups",
            "/assessment-options",
            "/questions",
            "/question-groups",
            "/score-profiles"
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();

        if (isPublicPath(path)) {
            return true;
        }

        RequestAuthUtil.AuthUser authUser = RequestAuthUtil.requireUser(request);
        request.setAttribute("authUserId", authUser.userId());
        request.setAttribute("authUserRole", authUser.role());

        if (isWriteMethod(request.getMethod()) && requiresWriteRole(path) && !WRITE_ROLES.contains(authUser.role())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only STAFF, LECTURER, ADMIN are allowed for write actions on this endpoint"
            );
        }

        return true;
    }

    private boolean isPublicPath(String path) {
        return path.equals("/health")
                || path.startsWith("/api-docs")
                || path.startsWith("/api-docs-ui")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.startsWith("/actuator");
    }

    private boolean isWriteMethod(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }

    private boolean requiresWriteRole(String path) {
        if (path.startsWith("/assessment/attempts")
                || path.startsWith("/assessment-progress")
                || path.startsWith("/assessment-answers")) {
            return false;
        }
        return WRITE_RESTRICTED_PREFIXES.stream().anyMatch(path::startsWith);
    }
}
