package com.torii.assessment.service;

import com.torii.assessment.dto.itemassessment.ItemAssessmentGroupLinkDTO;
import com.torii.assessment.dto.itemassessment.ItemAssessmentQuestionLinkDTO;
import com.torii.assessment.dto.itemassessment.UpdateItemAssessmentGroupsDTO;
import com.torii.assessment.dto.itemassessment.UpdateItemAssessmentQuestionsDTO;
import com.torii.assessment.entity.AssessmentItem;
import com.torii.assessment.entity.AssessmentQuestion;
import com.torii.assessment.entity.AssessmentQuestionGroup;
import com.torii.assessment.entity.ItemAssessmentGroup;
import com.torii.assessment.entity.ItemAssessmentQuestion;
import com.torii.assessment.repository.AssessmentItemRepository;
import com.torii.assessment.repository.AssessmentQuestionGroupRepository;
import com.torii.assessment.repository.AssessmentQuestionRepository;
import com.torii.assessment.repository.ItemAssessmentGroupRepository;
import com.torii.assessment.repository.ItemAssessmentQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ItemAssessmentLinkService {

    private final AssessmentItemRepository assessmentItemRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final AssessmentQuestionGroupRepository assessmentQuestionGroupRepository;
    private final ItemAssessmentQuestionRepository itemAssessmentQuestionRepository;
    private final ItemAssessmentGroupRepository itemAssessmentGroupRepository;

    @Transactional(readOnly = true)
    public List<ItemAssessmentQuestionLinkDTO> getQuestions(Long itemId) {
        ensureItemExists(itemId);
        return itemAssessmentQuestionRepository.findByItemIdOrderByOrderAsc(itemId).stream()
                .map(this::mapQuestionLink)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ItemAssessmentQuestionLinkDTO> replaceQuestions(Long itemId, UpdateItemAssessmentQuestionsDTO dto) {
        ensureItemExists(itemId);
        List<ItemAssessmentQuestionLinkDTO> links = dto != null && dto.getQuestions() != null
                ? dto.getQuestions()
                : Collections.emptyList();

        validateQuestionIds(links.stream().map(ItemAssessmentQuestionLinkDTO::getQuestionId).collect(Collectors.toList()));

        itemAssessmentQuestionRepository.deleteByItemId(itemId);

        int fallbackOrder = 0;
        for (ItemAssessmentQuestionLinkDTO link : links) {
            int order = link.getOrder() != null ? link.getOrder() : fallbackOrder++;
            ItemAssessmentQuestion entity = ItemAssessmentQuestion.builder()
                    .itemId(itemId)
                    .questionId(link.getQuestionId())
                    .order(order)
                    .score(link.getScore())
                    .build();
            itemAssessmentQuestionRepository.save(entity);
        }
        log.info("Replaced item {} assessment questions with {} link(s)", itemId, links.size());
        return getQuestions(itemId);
    }

    @Transactional(readOnly = true)
    public List<ItemAssessmentGroupLinkDTO> getGroups(Long itemId) {
        ensureItemExists(itemId);
        return itemAssessmentGroupRepository.findByItemIdOrderByOrderAsc(itemId).stream()
                .map(this::mapGroupLink)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<ItemAssessmentGroupLinkDTO> replaceGroups(Long itemId, UpdateItemAssessmentGroupsDTO dto) {
        ensureItemExists(itemId);
        List<ItemAssessmentGroupLinkDTO> links = dto != null && dto.getGroups() != null
                ? dto.getGroups()
                : Collections.emptyList();

        validateGroupIds(links.stream().map(ItemAssessmentGroupLinkDTO::getGroupId).collect(Collectors.toList()));

        itemAssessmentGroupRepository.deleteByItemId(itemId);

        int fallbackOrder = 0;
        for (ItemAssessmentGroupLinkDTO link : links) {
            int order = link.getOrder() != null ? link.getOrder() : fallbackOrder++;
            ItemAssessmentGroup entity = ItemAssessmentGroup.builder()
                    .itemId(itemId)
                    .groupId(link.getGroupId())
                    .order(order)
                    .score(link.getScore())
                    .build();
            itemAssessmentGroupRepository.save(entity);
        }
        log.info("Replaced item {} assessment groups with {} link(s)", itemId, links.size());
        return getGroups(itemId);
    }

    private void ensureItemExists(Long itemId) {
        if (!assessmentItemRepository.existsById(itemId)) {
            throw new RuntimeException("Assessment item not found: " + itemId);
        }
    }

    private void validateQuestionIds(List<Long> questionIds) {
        if (questionIds == null || questionIds.isEmpty()) {
            return;
        }
        Map<Long, AssessmentQuestion> found = assessmentQuestionRepository.findAllById(questionIds).stream()
                .collect(Collectors.toMap(AssessmentQuestion::getId, Function.identity()));
        Set<Long> missing = questionIds.stream()
                .filter(id -> !found.containsKey(id))
                .collect(Collectors.toSet());
        if (!missing.isEmpty()) {
            throw new RuntimeException("Assessment questions not found: " + missing);
        }
    }

    private void validateGroupIds(List<Long> groupIds) {
        if (groupIds == null || groupIds.isEmpty()) {
            return;
        }
        Map<Long, AssessmentQuestionGroup> found = assessmentQuestionGroupRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(AssessmentQuestionGroup::getId, Function.identity()));
        Set<Long> missing = groupIds.stream()
                .filter(id -> !found.containsKey(id))
                .collect(Collectors.toSet());
        if (!missing.isEmpty()) {
            throw new RuntimeException("Assessment question groups not found: " + missing);
        }
    }

    private ItemAssessmentQuestionLinkDTO mapQuestionLink(ItemAssessmentQuestion link) {
        return ItemAssessmentQuestionLinkDTO.builder()
                .questionId(link.getQuestionId())
                .order(link.getOrder())
                .score(link.getScore())
                .build();
    }

    private ItemAssessmentGroupLinkDTO mapGroupLink(ItemAssessmentGroup link) {
        return ItemAssessmentGroupLinkDTO.builder()
                .groupId(link.getGroupId())
                .order(link.getOrder())
                .score(link.getScore())
                .build();
    }
}
