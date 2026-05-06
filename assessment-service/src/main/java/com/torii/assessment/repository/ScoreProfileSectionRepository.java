package com.torii.assessment.repository;

import com.torii.assessment.entity.ScoreProfileSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreProfileSectionRepository extends JpaRepository<ScoreProfileSection, Long> {
    
    List<ScoreProfileSection> findByProfileId(Long profileId);
    
    void deleteByProfileId(Long profileId);
}
