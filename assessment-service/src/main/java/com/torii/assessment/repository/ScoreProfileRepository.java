package com.torii.assessment.repository;

import com.torii.assessment.entity.ScoreProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScoreProfileRepository extends JpaRepository<ScoreProfile, Long> {
    
    Optional<ScoreProfile> findByName(String name);
    
    boolean existsByName(String name);
    
    @Query("SELECT sp FROM ScoreProfile sp WHERE " +
           "(:level IS NULL OR sp.level = :level) AND " +
           "(:namePattern IS NULL OR LOWER(sp.name) LIKE :namePattern)")
    Page<ScoreProfile> findByFilters(
        @Param("level") String level,
        @Param("namePattern") String namePattern,
        Pageable pageable
    );
    
    @Query("SELECT COUNT(a) FROM Assessment a WHERE a.scoreProfile.id = :profileId")
    long countAssessmentsUsingProfile(@Param("profileId") Long profileId);
}
