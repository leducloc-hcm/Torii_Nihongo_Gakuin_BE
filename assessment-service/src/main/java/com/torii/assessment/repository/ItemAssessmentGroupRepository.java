package com.torii.assessment.repository;

import com.torii.assessment.entity.ItemAssessmentGroup;
import com.torii.assessment.entity.ItemAssessmentGroup.ItemAssessmentGroupId;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemAssessmentGroupRepository extends JpaRepository<ItemAssessmentGroup, ItemAssessmentGroupId> {

    List<ItemAssessmentGroup> findByItemIdOrderByOrderAsc(Long itemId);

    @Modifying
    @Query("DELETE FROM ItemAssessmentGroup g WHERE g.itemId = :itemId")
    void deleteByItemId(@Param("itemId") Long itemId);
}
