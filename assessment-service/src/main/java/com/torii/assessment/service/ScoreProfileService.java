package com.torii.assessment.service;

import com.torii.assessment.dto.scoreprofile.*;
import com.torii.assessment.entity.ScoreProfile;
import com.torii.assessment.entity.ScoreProfileSection;
import com.torii.assessment.repository.ScoreProfileRepository;
import com.torii.assessment.repository.ScoreProfileSectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScoreProfileService {
    
    private final ScoreProfileRepository scoreProfileRepository;
    private final ScoreProfileSectionRepository scoreProfileSectionRepository;
    
    @Transactional
    public ScoreProfileResponseDTO create(CreateScoreProfileDTO dto) {
        // Check if name already exists
        if (scoreProfileRepository.existsByName(dto.getName())) {
            throw new RuntimeException("Score profile with name '" + dto.getName() + "' already exists");
        }
        
        // Create profile
        ScoreProfile profile = new ScoreProfile();
        profile.setName(dto.getName());
        profile.setLevel(dto.getLevel());
        profile.setMaxTotal(dto.getMaxTotal());
        profile.setMinTotalPass(dto.getMinTotalPass());
        profile.setNotes(dto.getNotes());
        
        ScoreProfile savedProfile = scoreProfileRepository.save(profile);
        
        // Create sections with normalized weights
        List<ScoreProfileSectionDTO> normalizedSections = normalizeWeights(dto.getSections());
        for (ScoreProfileSectionDTO sectionDto : normalizedSections) {
            ScoreProfileSection section = new ScoreProfileSection();
            section.setProfile(savedProfile);
            section.setType(sectionDto.getType());
            section.setTitle(sectionDto.getTitle());
            section.setMaxScore(sectionDto.getMaxScore());
            section.setWeight(sectionDto.getWeight());
            section.setMinPass(sectionDto.getMinPass());
            section.setDefaultTimeSec(sectionDto.getDefaultTimeSec());
            scoreProfileSectionRepository.save(section);
        }
        
        log.info("Created score profile: {}", savedProfile.getId());
        
        // Reload to get sections
        return findById(savedProfile.getId());
    }
    
    public ScoreProfileListResponseDTO findMany(ScoreProfileQueryDTO query) {
        // Build sort
        Sort.Direction direction = "desc".equalsIgnoreCase(query.getSortOrder()) 
            ? Sort.Direction.DESC 
            : Sort.Direction.ASC;
        Sort sort = Sort.by(direction, mapSortField(query.getSortBy()));
        
        // Build pageable
        int page = query.getPage() != null ? query.getPage() - 1 : 0; // Convert to 0-based
        int limit = query.getLimit() != null ? query.getLimit() : 20;
        Pageable pageable = PageRequest.of(page, limit, sort);
        
        // Query
        Page<ScoreProfile> profilePage = scoreProfileRepository.findByFilters(
            query.getLevel(),
            query.getName(),
            pageable
        );
        
        // Map to DTOs
        List<ScoreProfileResponseDTO> data = profilePage.getContent().stream()
            .map(this::mapToResponseDTO)
            .collect(Collectors.toList());
        
        ScoreProfileListResponseDTO.PaginationDTO pagination = new ScoreProfileListResponseDTO.PaginationDTO(
            profilePage.getTotalElements(),
            query.getPage() != null ? query.getPage() : 1,
            limit,
            profilePage.getTotalPages()
        );
        
        return new ScoreProfileListResponseDTO(data, pagination);
    }
    
    public ScoreProfileResponseDTO findById(Long id) {
        ScoreProfile profile = scoreProfileRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Score profile with ID " + id + " not found"));
        
        return mapToResponseDTO(profile);
    }
    
    @Transactional
    public ScoreProfileResponseDTO update(Long id, UpdateScoreProfileDTO dto) {
        ScoreProfile existing = scoreProfileRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Score profile with ID " + id + " not found"));
        
        // Check name uniqueness if changed
        if (dto.getName() != null && !dto.getName().equals(existing.getName())) {
            if (scoreProfileRepository.existsByName(dto.getName())) {
                throw new RuntimeException("Score profile with name '" + dto.getName() + "' already exists");
            }
            existing.setName(dto.getName());
        }
        
        // Update fields
        if (dto.getLevel() != null) {
            existing.setLevel(dto.getLevel());
        }
        if (dto.getMaxTotal() != null) {
            existing.setMaxTotal(dto.getMaxTotal());
        }
        if (dto.getMinTotalPass() != null) {
            existing.setMinTotalPass(dto.getMinTotalPass());
        }
        if (dto.getNotes() != null) {
            existing.setNotes(dto.getNotes());
        }

        scoreProfileRepository.save(existing);
        
        // Update sections if provided
        if (dto.getSections() != null && !dto.getSections().isEmpty()) {
            // Delete old sections
            scoreProfileSectionRepository.deleteByProfileId(id);
            
            // Create new sections
            List<ScoreProfileSectionDTO> normalizedSections = normalizeWeights(dto.getSections());
            for (ScoreProfileSectionDTO sectionDto : normalizedSections) {
                ScoreProfileSection section = new ScoreProfileSection();
                section.setProfile(existing);
                section.setType(sectionDto.getType());
                section.setTitle(sectionDto.getTitle());
                section.setMaxScore(sectionDto.getMaxScore());
                section.setWeight(sectionDto.getWeight());
                section.setMinPass(sectionDto.getMinPass());
                section.setDefaultTimeSec(sectionDto.getDefaultTimeSec());
                scoreProfileSectionRepository.save(section);
            }
        }
        
        log.info("Updated score profile: {}", id);
        
        return findById(id);
    }
    
    @Transactional
    public void delete(Long id) {
        ScoreProfile existing = scoreProfileRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Score profile with ID " + id + " not found"));
        
        // Check if profile is in use
        long usageCount = scoreProfileRepository.countAssessmentsUsingProfile(id);
        if (usageCount > 0) {
            throw new RuntimeException("Cannot delete score profile: " + usageCount + " assessments are using this profile");
        }
        
        scoreProfileRepository.delete(existing);
        log.info("Deleted score profile: {}", id);
    }
    
    // ===== Helper Methods =====
    
    private List<ScoreProfileSectionDTO> normalizeWeights(List<ScoreProfileSectionDTO> sections) {
        boolean hasWeights = sections.stream()
            .anyMatch(s -> s.getWeight() != null && s.getWeight().compareTo(BigDecimal.ZERO) > 0);
        
        if (!hasWeights) {
            // Distribute weights equally
            BigDecimal equalWeight = BigDecimal.valueOf(100.0 / sections.size())
                .setScale(2, RoundingMode.HALF_UP);
            
            sections.forEach(s -> s.setWeight(equalWeight));
        } else {
            // Set default weight of 0 for sections without weight
            sections.forEach(s -> {
                if (s.getWeight() == null) {
                    s.setWeight(BigDecimal.ZERO);
                }
            });
        }
        
        return sections;
    }
    
    private String mapSortField(String sortBy) {
        if (sortBy == null) return "createdAt";
        return switch (sortBy) {
            case "id" -> "id";
            case "name" -> "name";
            case "level" -> "level";
            case "updatedAt" -> "updatedAt";
            default -> "createdAt";
        };
    }
    
    private ScoreProfileResponseDTO mapToResponseDTO(ScoreProfile profile) {
        ScoreProfileResponseDTO dto = new ScoreProfileResponseDTO();
        dto.setId(profile.getId());
        dto.setName(profile.getName());
        dto.setLevel(profile.getLevel());
        dto.setMaxTotal(profile.getMaxTotal());
        dto.setMinTotalPass(profile.getMinTotalPass());
        dto.setNotes(profile.getNotes());
        dto.setCreatedAt(profile.getCreatedAt());
        dto.setUpdatedAt(profile.getUpdatedAt());
        
        // Map sections
        List<ScoreProfileSection> sections = scoreProfileSectionRepository.findByProfileId(profile.getId());
        List<ScoreProfileSectionDTO> sectionDtos = sections.stream()
            .map(this::mapSectionToDTO)
            .collect(Collectors.toList());
        dto.setSections(sectionDtos);
        
        return dto;
    }
    
    private ScoreProfileSectionDTO mapSectionToDTO(ScoreProfileSection section) {
        ScoreProfileSectionDTO dto = new ScoreProfileSectionDTO();
        dto.setId(section.getId());
        dto.setType(section.getType());
        dto.setTitle(section.getTitle());
        dto.setMaxScore(section.getMaxScore());
        dto.setWeight(section.getWeight());
        dto.setMinPass(section.getMinPass());
        dto.setDefaultTimeSec(section.getDefaultTimeSec());
        return dto;
    }
}
