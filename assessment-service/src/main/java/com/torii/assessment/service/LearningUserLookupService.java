package com.torii.assessment.service;

import com.torii.assessment.dto.assessment.AssessmentDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LearningUserLookupService {

    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public AssessmentDTO.CreatorInfoDTO getCreatorById(Integer userId) {
        if (userId == null) {
            return null;
        }
        return getCreatorsByIds(Set.of(userId)).get(userId);
    }

    public Map<Integer, AssessmentDTO.CreatorInfoDTO> getCreatorsByIds(Collection<Integer> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Set<Integer> normalizedIds = userIds.stream()
            .filter(id -> id != null)
            .collect(Collectors.toSet());

        if (normalizedIds.isEmpty()) {
            return Collections.emptyMap();
        }

        String sql = """
            SELECT
                u.id AS id,
                u.email AS email,
                u.name AS name,
                u.role AS role,
                COALESCE(cp."username", lp."username", sp."username", ap."username") AS username
            FROM learning."User" u
            LEFT JOIN learning."CustomerProfile" cp ON cp."user_id" = u.id
            LEFT JOIN learning."LecturerProfile" lp ON lp."userId" = u.id
            LEFT JOIN learning."StaffProfile" sp ON sp."userId" = u.id
            LEFT JOIN learning."AdminProfile" ap ON ap."userId" = u.id
            WHERE u.id IN (:ids)
            """;

        try {
            MapSqlParameterSource params = new MapSqlParameterSource("ids", normalizedIds);
            return namedParameterJdbcTemplate.query(sql, params, rs -> {
                Map<Integer, AssessmentDTO.CreatorInfoDTO> result = new LinkedHashMap<>();
                while (rs.next()) {
                    Integer id = rs.getInt("id");
                    result.put(id, AssessmentDTO.CreatorInfoDTO.builder()
                        .id(id)
                        .email(rs.getString("email"))
                        .name(rs.getString("name"))
                        .role(rs.getString("role"))
                        .username(rs.getString("username"))
                        .build());
                }
                return result;
            });
        } catch (Exception ex) {
            log.warn("Cannot enrich creator info from learning schema", ex);
            return Collections.emptyMap();
        }
    }
}
