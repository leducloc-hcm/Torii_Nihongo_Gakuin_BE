package com.torii.assessment.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Set;

public final class RequestAuthUtil {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Set<String> PRIVILEGED_ROLES = Set.of("STAFF", "LECTURER", "ADMIN");

    private RequestAuthUtil() {
    }

    public record AuthUser(Integer userId, String role) {
    }

    public static AuthUser requireUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7).trim();
        if (token.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Access token is empty");
        }

        JsonNode payload = decodePayload(token);
        Integer userId = extractUserId(payload);
        String role = extractRole(payload);

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token does not contain user id");
        }
        if (role == null || role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token does not contain role");
        }

        return new AuthUser(userId, role.toUpperCase());
    }

    public static AuthUser getAuthUser(HttpServletRequest request) {
        Object userIdAttr = request.getAttribute("authUserId");
        Object roleAttr = request.getAttribute("authUserRole");

        if (userIdAttr instanceof Integer userId && roleAttr instanceof String role && !role.isBlank()) {
            return new AuthUser(userId, role.toUpperCase());
        }

        return requireUser(request);
    }

    public static boolean isPrivilegedRole(String role) {
        return role != null && PRIVILEGED_ROLES.contains(role.toUpperCase());
    }

    public static void ensureSelfOrPrivileged(AuthUser authUser, Integer targetUserId) {
        if (targetUserId == null) {
            return;
        }
        if (isPrivilegedRole(authUser.role())) {
            return;
        }
        if (!authUser.userId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "CUSTOMER can only access their own data");
        }
    }

    private static JsonNode decodePayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid JWT token format");
            }
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            return OBJECT_MAPPER.readTree(new String(decoded, StandardCharsets.UTF_8));
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cannot decode access token", ex);
        }
    }

    private static Integer extractUserId(JsonNode payload) {
        if (payload.has("userId") && payload.get("userId").canConvertToInt()) {
            return payload.get("userId").asInt();
        }
        if (payload.has("id") && payload.get("id").canConvertToInt()) {
            return payload.get("id").asInt();
        }
        if (payload.has("sub")) {
            JsonNode sub = payload.get("sub");
            if (sub.canConvertToInt()) {
                return sub.asInt();
            }
            if (sub.isTextual()) {
                try {
                    return Integer.parseInt(sub.asText());
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private static String extractRole(JsonNode payload) {
        if (payload.has("role") && payload.get("role").isTextual()) {
            return payload.get("role").asText();
        }
        if (payload.has("roles") && payload.get("roles").isArray() && payload.get("roles").size() > 0) {
            JsonNode firstRole = payload.get("roles").get(0);
            if (firstRole != null && firstRole.isTextual()) {
                return firstRole.asText();
            }
        }
        return null;
    }
}
