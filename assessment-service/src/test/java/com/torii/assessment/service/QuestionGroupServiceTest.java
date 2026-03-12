package com.torii.assessment.service;

import com.torii.assessment.dto.questiongroup.*;
import com.torii.assessment.entity.Question;
import com.torii.assessment.entity.QuestionGroup;
import com.torii.assessment.entity.QuestionGroup.QuestionGroupType;
import com.torii.assessment.entity.QuestionGroupQuestion;
import com.torii.assessment.repository.QuestionGroupQuestionRepository;
import com.torii.assessment.repository.QuestionGroupRepository;
import com.torii.assessment.repository.QuestionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestionGroupService Unit Tests")
class QuestionGroupServiceTest {

    @Mock private QuestionGroupRepository questionGroupRepository;
    @Mock private QuestionGroupQuestionRepository questionGroupQuestionRepository;
    @Mock private QuestionRepository questionRepository;
    @Mock private S3Service s3Service;

    @InjectMocks
    private QuestionGroupService questionGroupService;

    // ── Fixtures ────────────────────────────────────────────────────────────

    private QuestionGroup buildGroup(Long id, QuestionGroupType type) {
        return QuestionGroup.builder()
                .id(id)
                .uuid("uuid-" + id)
                .version(1)
                .type(type)
                .title("Group " + id)
                .passage("Passage " + id)
                .mediaId(null)
                .mediaUrl(null)
                .audioUrl(null)
                .order(1)
                .createdAt(LocalDateTime.now())
                .questions(new ArrayList<>())
                .build();
    }

    private Question buildQuestion(Long id) {
        return Question.builder()
                .id(id)
                .stem("Stem " + id)
                .type(Question.QuestionType.VOCAB)
                .level(Question.JLPTLevel.N5)
                .difficulty(Question.Difficulty.EASY)
                .build();
    }

    private QuestionGroupQuestion buildQGQ(Long groupId, Long questionId, Question q) {
        return QuestionGroupQuestion.builder()
                .groupId(groupId)
                .questionId(questionId)
                .order(1)
                .score(1.0)
                .question(q)
                .build();
    }

    // ── createQuestionGroup ──────────────────────────────────────────────────

    @Nested
    @DisplayName("createQuestionGroup")
    class CreateQuestionGroup {

        @Test
        @DisplayName("creates group without files")
        void createGroup_noFiles_success() throws IOException {
            CreateQuestionGroupDTO dto = CreateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.GRAMMAR)
                    .title("Grammar Group")
                    .passage("Some passage")
                    .order(1)
                    .questions(new ArrayList<>())
                    .build();

            QuestionGroup saved = buildGroup(1L, QuestionGroupType.GRAMMAR);
            when(questionGroupRepository.save(any())).thenReturn(saved);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(saved));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.createQuestionGroup(dto, null, null);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
            verify(s3Service, never()).uploadFile(any(), any());
            verify(questionGroupRepository).save(any());
        }

        @Test
        @DisplayName("uploads image when image file provided")
        void createGroup_withImage_uploadsImage() throws IOException {
            CreateQuestionGroupDTO dto = CreateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.VOCAB)
                    .title("Vocab Group")
                    .questions(new ArrayList<>())
                    .build();

            MultipartFile image = new MockMultipartFile("image", "img.jpg", "image/jpeg", "data".getBytes());
            QuestionGroup saved = buildGroup(2L, QuestionGroupType.VOCAB);
            saved.setMediaUrl("https://s3/img.jpg");

            when(s3Service.uploadFile(image, "question-groups/images")).thenReturn("https://s3/img.jpg");
            when(questionGroupRepository.save(any())).thenReturn(saved);
            when(questionGroupRepository.findByIdWithQuestions(2L)).thenReturn(Optional.of(saved));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(2L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.createQuestionGroup(dto, image, null);

            verify(s3Service).uploadFile(image, "question-groups/images");
            assertThat(result.getMediaUrl()).isEqualTo("https://s3/img.jpg");
        }

        @Test
        @DisplayName("uploads audio when audio file provided")
        void createGroup_withAudio_uploadsAudio() throws IOException {
            CreateQuestionGroupDTO dto = CreateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.LISTENING)
                    .title("Listening Group")
                    .questions(new ArrayList<>())
                    .build();

            MultipartFile audio = new MockMultipartFile("audio", "audio.mp3", "audio/mpeg", "data".getBytes());
            QuestionGroup saved = buildGroup(3L, QuestionGroupType.LISTENING);
            saved.setAudioUrl("https://s3/audio.mp3");

            when(s3Service.uploadFile(audio, "question-groups/audio")).thenReturn("https://s3/audio.mp3");
            when(questionGroupRepository.save(any())).thenReturn(saved);
            when(questionGroupRepository.findByIdWithQuestions(3L)).thenReturn(Optional.of(saved));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(3L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.createQuestionGroup(dto, null, audio);

            verify(s3Service).uploadFile(audio, "question-groups/audio");
            assertThat(result.getAudioUrl()).isEqualTo("https://s3/audio.mp3");
        }

        @Test
        @DisplayName("uses dto.mediaUrl when no image file provided")
        void createGroup_dtoMediaUrl_usedWhenNoFile() throws IOException {
            CreateQuestionGroupDTO dto = CreateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.KANJI)
                    .mediaUrl("https://existing/img.jpg")
                    .questions(new ArrayList<>())
                    .build();

            QuestionGroup saved = buildGroup(4L, QuestionGroupType.KANJI);
            saved.setMediaUrl("https://existing/img.jpg");

            when(questionGroupRepository.save(any())).thenReturn(saved);
            when(questionGroupRepository.findByIdWithQuestions(4L)).thenReturn(Optional.of(saved));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(4L)).thenReturn(List.of());

            questionGroupService.createQuestionGroup(dto, null, null);

            ArgumentCaptor<QuestionGroup> captor = ArgumentCaptor.forClass(QuestionGroup.class);
            verify(questionGroupRepository).save(captor.capture());
            assertThat(captor.getValue().getMediaUrl()).isEqualTo("https://existing/img.jpg");
        }

        @Test
        @DisplayName("adds questions when provided in dto")
        void createGroup_withQuestions_addsRelations() throws IOException {
            CreateQuestionGroupDTO dto = CreateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.GRAMMAR)
                    .questions(List.of(10L, 11L))
                    .build();

            QuestionGroup saved = buildGroup(5L, QuestionGroupType.GRAMMAR);
            when(questionGroupRepository.save(any())).thenReturn(saved);
            when(questionGroupRepository.findByIdWithQuestions(5L)).thenReturn(Optional.of(saved));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(5L)).thenReturn(List.of());
            when(questionGroupQuestionRepository.getMaxOrderByGroupId(5L)).thenReturn(0);
            when(questionGroupQuestionRepository.existsByGroupIdAndQuestionId(eq(5L), anyLong())).thenReturn(false);

            questionGroupService.createQuestionGroup(dto, null, null);

            verify(questionGroupQuestionRepository).saveAll(anyList());
        }
    }

    // ── getAllQuestionGroups ──────────────────────────────────────────────────

    @Nested
    @DisplayName("getAllQuestionGroups")
    class GetAllQuestionGroups {

        @Test
        @DisplayName("returns paginated data and pagination metadata")
        @SuppressWarnings("unchecked")
        void getAll_returnsPaginatedResult() {
            QuestionGroup g1 = buildGroup(1L, QuestionGroupType.VOCAB);
            QuestionGroup g2 = buildGroup(2L, QuestionGroupType.KANJI);
            Page<QuestionGroup> page = new PageImpl<>(List.of(g1, g2));

            when(questionGroupRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(anyLong())).thenReturn(List.of());

            QueryQuestionGroupDTO query = QueryQuestionGroupDTO.builder().page(1).limit(10).build();
            Map<String, Object> result = questionGroupService.getAllQuestionGroups(query);

            assertThat(result).containsKeys("data", "pagination");
            assertThat((List<?>) result.get("data")).hasSize(2);

            @SuppressWarnings("unchecked")
            Map<String, Object> pagination = (Map<String, Object>) result.get("pagination");
            assertThat(pagination.get("total")).isEqualTo(2L);
            assertThat(pagination.get("page")).isEqualTo(1);
            assertThat(pagination.get("limit")).isEqualTo(10);
        }

        @Test
        @DisplayName("returns data key before pagination key (ordering)")
        @SuppressWarnings("unchecked")
        void getAll_dataBeforePagination() {
            Page<QuestionGroup> page = new PageImpl<>(List.of());
            when(questionGroupRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            QueryQuestionGroupDTO query = QueryQuestionGroupDTO.builder().page(1).limit(10).build();
            Map<String, Object> result = questionGroupService.getAllQuestionGroups(query);

            List<String> keys = new ArrayList<>(result.keySet());
            assertThat(keys.indexOf("data")).isLessThan(keys.indexOf("pagination"));
        }

        @Test
        @DisplayName("filters by type when type provided")
        @SuppressWarnings("unchecked")
        void getAll_withTypeFilter_passesSpecification() {
            Page<QuestionGroup> page = new PageImpl<>(List.of());
            when(questionGroupRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            QueryQuestionGroupDTO query = QueryQuestionGroupDTO.builder()
                    .page(1).limit(10).type(QuestionGroupType.READING_SHORT).build();
            questionGroupService.getAllQuestionGroups(query);

            verify(questionGroupRepository).findAll(any(Specification.class), any(Pageable.class));
        }
    }

    // ── getQuestionGroupById ─────────────────────────────────────────────────

    @Nested
    @DisplayName("getQuestionGroupById")
    class GetQuestionGroupById {

        @Test
        @DisplayName("returns DTO for existing group")
        void getById_found_returnsDTO() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.getQuestionGroupById(1L);

            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getType()).isEqualTo(QuestionGroupType.VOCAB);
        }

        @Test
        @DisplayName("throws RuntimeException when group not found")
        void getById_notFound_throwsException() {
            when(questionGroupRepository.findByIdWithQuestions(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> questionGroupService.getQuestionGroupById(99L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("maps questions to response DTO")
        void getById_mapsQuestionsCorrectly() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.GRAMMAR);
            Question q = buildQuestion(10L);
            QuestionGroupQuestion qgq = buildQGQ(1L, 10L, q);

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of(qgq));

            QuestionGroupResponseDTO result = questionGroupService.getQuestionGroupById(1L);

            assertThat(result.getQuestions()).hasSize(1);
            assertThat(result.getQuestionsCount()).isEqualTo(1);
            assertThat(result.getQuestions().get(0).getId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("hasMedia is true when mediaUrl is set")
        void getById_hasMediaTrue_whenMediaUrlSet() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);
            g.setMediaUrl("https://s3/img.jpg");

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.getQuestionGroupById(1L);

            assertThat(result.getHasMedia()).isTrue();
        }

        @Test
        @DisplayName("hasPassage is false when passage is empty")
        void getById_hasPassageFalse_whenPassageEmpty() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);
            g.setPassage("");

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.getQuestionGroupById(1L);

            assertThat(result.getHasPassage()).isFalse();
        }
    }

    // ── updateQuestionGroup ──────────────────────────────────────────────────

    @Nested
    @DisplayName("updateQuestionGroup")
    class UpdateQuestionGroup {

        @Test
        @DisplayName("updates fields from DTO")
        void update_updatesFields() throws IOException {
            QuestionGroup existing = buildGroup(1L, QuestionGroupType.VOCAB);
            UpdateQuestionGroupDTO dto = UpdateQuestionGroupDTO.builder()
                    .title("New Title")
                    .passage("New Passage")
                    .type(QuestionGroupType.KANJI)
                    .build();

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(questionGroupRepository.save(any())).thenReturn(existing);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(existing));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.updateQuestionGroup(1L, dto, null, null);

            assertThat(existing.getTitle()).isEqualTo("New Title");
            assertThat(existing.getPassage()).isEqualTo("New Passage");
            assertThat(existing.getType()).isEqualTo(QuestionGroupType.KANJI);
        }

        @Test
        @DisplayName("uploads new image when image file provided")
        void update_withImage_uploadsImage() throws IOException {
            QuestionGroup existing = buildGroup(1L, QuestionGroupType.VOCAB);
            UpdateQuestionGroupDTO dto = new UpdateQuestionGroupDTO();
            MultipartFile image = new MockMultipartFile("image", "new.jpg", "image/jpeg", "data".getBytes());

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(s3Service.uploadFile(image, "question-groups/images")).thenReturn("https://s3/new.jpg");
            when(questionGroupRepository.save(any())).thenReturn(existing);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(existing));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.updateQuestionGroup(1L, dto, image, null);

            verify(s3Service).uploadFile(image, "question-groups/images");
            assertThat(existing.getMediaUrl()).isEqualTo("https://s3/new.jpg");
        }

        @Test
        @DisplayName("uploads new audio when audio file provided")
        void update_withAudio_uploadsAudio() throws IOException {
            QuestionGroup existing = buildGroup(1L, QuestionGroupType.LISTENING);
            UpdateQuestionGroupDTO dto = new UpdateQuestionGroupDTO();
            MultipartFile audio = new MockMultipartFile("audio", "new.mp3", "audio/mpeg", "data".getBytes());

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(s3Service.uploadFile(audio, "question-groups/audio")).thenReturn("https://s3/new.mp3");
            when(questionGroupRepository.save(any())).thenReturn(existing);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(existing));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.updateQuestionGroup(1L, dto, null, audio);

            verify(s3Service).uploadFile(audio, "question-groups/audio");
            assertThat(existing.getAudioUrl()).isEqualTo("https://s3/new.mp3");
        }

        @Test
        @DisplayName("uses dto.audioUrl when no audio file provided")
        void update_dtoAudioUrl_setWhenNoFile() throws IOException {
            QuestionGroup existing = buildGroup(1L, QuestionGroupType.LISTENING);
            UpdateQuestionGroupDTO dto = UpdateQuestionGroupDTO.builder()
                    .audioUrl("https://existing/audio.mp3")
                    .build();

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(questionGroupRepository.save(any())).thenReturn(existing);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(existing));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.updateQuestionGroup(1L, dto, null, null);

            assertThat(existing.getAudioUrl()).isEqualTo("https://existing/audio.mp3");
            verify(s3Service, never()).uploadFile(any(), any());
        }

        @Test
        @DisplayName("replaces questions when questions list provided")
        void update_withQuestions_replacesRelations() throws IOException {
            QuestionGroup existing = buildGroup(1L, QuestionGroupType.GRAMMAR);
            UpdateQuestionGroupDTO dto = UpdateQuestionGroupDTO.builder()
                    .questions(List.of(20L, 21L))
                    .build();

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(existing));
            when(questionGroupRepository.save(any())).thenReturn(existing);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(existing));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());
            when(questionGroupQuestionRepository.getMaxOrderByGroupId(1L)).thenReturn(0);
            when(questionGroupQuestionRepository.existsByGroupIdAndQuestionId(eq(1L), anyLong())).thenReturn(false);

            questionGroupService.updateQuestionGroup(1L, dto, null, null);

            verify(questionGroupQuestionRepository).deleteAllByGroupId(1L);
            verify(questionGroupQuestionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("throws RuntimeException when group not found")
        void update_notFound_throwsException() {
            when(questionGroupRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> questionGroupService.updateQuestionGroup(99L, new UpdateQuestionGroupDTO(), null, null))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }
    }

    // ── deleteQuestionGroup ──────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteQuestionGroup")
    class DeleteQuestionGroup {

        @Test
        @DisplayName("deletes existing group successfully")
        void delete_existing_success() {
            when(questionGroupRepository.existsById(1L)).thenReturn(true);

            questionGroupService.deleteQuestionGroup(1L);

            verify(questionGroupRepository).deleteById(1L);
        }

        @Test
        @DisplayName("throws RuntimeException when group not found")
        void delete_notFound_throwsException() {
            when(questionGroupRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> questionGroupService.deleteQuestionGroup(99L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");

            verify(questionGroupRepository, never()).deleteById(any());
        }
    }

    // ── addQuestionsToGroup ──────────────────────────────────────────────────

    @Nested
    @DisplayName("addQuestionsToGroup")
    class AddQuestionsToGroup {

        @Test
        @DisplayName("adds questions to existing group")
        void add_validQuestions_success() {
            AddQuestionsToGroupDTO dto = new AddQuestionsToGroupDTO(List.of(10L, 11L));
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);

            when(questionGroupRepository.existsById(1L)).thenReturn(true);
            when(questionRepository.existsById(10L)).thenReturn(true);
            when(questionRepository.existsById(11L)).thenReturn(true);
            when(questionGroupQuestionRepository.getMaxOrderByGroupId(1L)).thenReturn(2);
            when(questionGroupQuestionRepository.existsByGroupIdAndQuestionId(eq(1L), anyLong())).thenReturn(false);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.addQuestionsToGroup(1L, dto);

            verify(questionGroupQuestionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("throws when group not found")
        void add_groupNotFound_throwsException() {
            when(questionGroupRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> questionGroupService.addQuestionsToGroup(99L, new AddQuestionsToGroupDTO(List.of(1L))))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }

        @Test
        @DisplayName("throws when a question does not exist")
        void add_questionNotFound_throwsException() {
            AddQuestionsToGroupDTO dto = new AddQuestionsToGroupDTO(List.of(999L));
            when(questionGroupRepository.existsById(1L)).thenReturn(true);
            when(questionRepository.existsById(999L)).thenReturn(false);

            assertThatThrownBy(() -> questionGroupService.addQuestionsToGroup(1L, dto))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("999");
        }

        @Test
        @DisplayName("skips duplicate questions already in group")
        void add_duplicateQuestion_skipped() {
            AddQuestionsToGroupDTO dto = new AddQuestionsToGroupDTO(List.of(10L));
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);

            when(questionGroupRepository.existsById(1L)).thenReturn(true);
            when(questionRepository.existsById(10L)).thenReturn(true);
            when(questionGroupQuestionRepository.getMaxOrderByGroupId(1L)).thenReturn(1);
            when(questionGroupQuestionRepository.existsByGroupIdAndQuestionId(1L, 10L)).thenReturn(true);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.addQuestionsToGroup(1L, dto);

            ArgumentCaptor<List> captor = ArgumentCaptor.forClass(List.class);
            verify(questionGroupQuestionRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).isEmpty();
        }
    }

    // ── removeQuestionsFromGroup ─────────────────────────────────────────────

    @Nested
    @DisplayName("removeQuestionsFromGroup")
    class RemoveQuestionsFromGroup {

        @Test
        @DisplayName("removes questions successfully")
        void remove_validGroup_success() {
            RemoveQuestionsFromGroupDTO dto = new RemoveQuestionsFromGroupDTO(List.of(10L, 11L));
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);

            when(questionGroupRepository.existsById(1L)).thenReturn(true);
            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            questionGroupService.removeQuestionsFromGroup(1L, dto);

            verify(questionGroupQuestionRepository).deleteByGroupIdAndQuestionIds(1L, List.of(10L, 11L));
        }

        @Test
        @DisplayName("throws when group not found")
        void remove_groupNotFound_throwsException() {
            when(questionGroupRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> questionGroupService.removeQuestionsFromGroup(99L, new RemoveQuestionsFromGroupDTO(List.of(1L))))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }
    }

    // ── getGroupQuestions ────────────────────────────────────────────────────

    @Nested
    @DisplayName("getGroupQuestions")
    class GetGroupQuestions {

        @Test
        @DisplayName("returns group info and questions list")
        void getGroupQuestions_returnsCorrectStructure() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.GRAMMAR);
            Question q = buildQuestion(10L);
            QuestionGroupQuestion qgq = buildQGQ(1L, 10L, q);

            when(questionGroupRepository.findById(1L)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of(qgq));

            Map<String, Object> result = questionGroupService.getGroupQuestions(1L);

            assertThat(result).containsKeys("group", "questions", "questionsCount");
            assertThat(result.get("questionsCount")).isEqualTo(1);
        }

        @Test
        @DisplayName("throws when group not found")
        void getGroupQuestions_notFound_throwsException() {
            when(questionGroupRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> questionGroupService.getGroupQuestions(99L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }
    }

    // ── getStatistics ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getStatistics")
    class GetStatistics {

        @Test
        @DisplayName("returns all statistic keys")
        void getStatistics_returnsAllKeys() {
            when(questionGroupRepository.count()).thenReturn(5L);
            when(questionGroupRepository.countByType(any())).thenReturn(1L);
            when(questionGroupRepository.countByMediaIdIsNotNull()).thenReturn(2L);
            when(questionGroupRepository.countByMediaIdIsNull()).thenReturn(3L);
            when(questionGroupRepository.countByPassageIsNotNull()).thenReturn(4L);
            when(questionGroupRepository.countByPassageIsNull()).thenReturn(1L);
            when(questionGroupRepository.findAll()).thenReturn(List.of());

            Map<String, Object> stats = questionGroupService.getStatistics();

            assertThat(stats).containsKeys("totalGroups", "byType", "withMedia", "withoutMedia",
                    "withPassage", "withoutPassage", "averageQuestionsPerGroup");
            assertThat(stats.get("totalGroups")).isEqualTo(5L);
            assertThat(stats.get("withMedia")).isEqualTo(2L);
        }
    }

    // ── cloneQuestionGroup ───────────────────────────────────────────────────

    @Nested
    @DisplayName("cloneQuestionGroup")
    class CloneQuestionGroup {

        @Test
        @DisplayName("clones group with incremented version")
        void clone_createsNewVersion() {
            QuestionGroup original = buildGroup(1L, QuestionGroupType.VOCAB);
            QuestionGroup v2 = buildGroup(2L, QuestionGroupType.VOCAB);
            v2.setVersion(2);

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(original));
            when(questionGroupRepository.findByUuidOrderByVersionDesc(original.getUuid()))
                    .thenReturn(List.of(original));
            when(questionGroupRepository.save(any())).thenReturn(v2);
            when(questionGroupRepository.findByIdWithQuestions(2L)).thenReturn(Optional.of(v2));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(anyLong())).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.cloneQuestionGroup(1L, new UpdateQuestionGroupDTO());

            assertThat(result.getVersion()).isEqualTo(2);
            verify(questionGroupRepository).save(argThat(g -> g.getVersion() == 2));
        }

        @Test
        @DisplayName("applies modifications to clone")
        void clone_withModifications_appliesChanges() {
            QuestionGroup original = buildGroup(1L, QuestionGroupType.VOCAB);
            QuestionGroup cloned = buildGroup(2L, QuestionGroupType.KANJI);
            cloned.setTitle("Modified Title");
            cloned.setVersion(2);

            UpdateQuestionGroupDTO modifications = UpdateQuestionGroupDTO.builder()
                    .type(QuestionGroupType.KANJI)
                    .title("Modified Title")
                    .build();

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(original));
            when(questionGroupRepository.findByUuidOrderByVersionDesc(original.getUuid()))
                    .thenReturn(List.of(original));
            when(questionGroupRepository.save(any())).thenReturn(cloned);
            when(questionGroupRepository.findByIdWithQuestions(2L)).thenReturn(Optional.of(cloned));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(anyLong())).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.cloneQuestionGroup(1L, modifications);

            verify(questionGroupRepository).save(argThat(g ->
                    g.getType() == QuestionGroupType.KANJI && "Modified Title".equals(g.getTitle())));
        }

        @Test
        @DisplayName("clones original questions when no modifications provided")
        void clone_noModifications_copiesOriginalQuestions() {
            QuestionGroup original = buildGroup(1L, QuestionGroupType.VOCAB);
            QuestionGroup cloned = buildGroup(2L, QuestionGroupType.VOCAB);
            cloned.setVersion(2);

            QuestionGroupQuestion qgq = QuestionGroupQuestion.builder()
                    .groupId(1L).questionId(10L).order(1).build();

            when(questionGroupRepository.findByIdWithQuestions(1L)).thenReturn(Optional.of(original));
            when(questionGroupRepository.findByUuidOrderByVersionDesc(original.getUuid()))
                    .thenReturn(List.of(original));
            when(questionGroupRepository.save(any())).thenReturn(cloned);
            when(questionGroupRepository.findByIdWithQuestions(2L)).thenReturn(Optional.of(cloned));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of(qgq));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(2L)).thenReturn(List.of());
            when(questionGroupQuestionRepository.getMaxOrderByGroupId(2L)).thenReturn(0);
            when(questionGroupQuestionRepository.existsByGroupIdAndQuestionId(eq(2L), anyLong())).thenReturn(false);

            questionGroupService.cloneQuestionGroup(1L, new UpdateQuestionGroupDTO());

            verify(questionGroupQuestionRepository).saveAll(anyList());
        }

        @Test
        @DisplayName("throws when source group not found")
        void clone_notFound_throwsException() {
            when(questionGroupRepository.findByIdWithQuestions(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> questionGroupService.cloneQuestionGroup(99L, new UpdateQuestionGroupDTO()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }
    }

    // ── getQuestionGroupVersions ─────────────────────────────────────────────

    @Nested
    @DisplayName("getQuestionGroupVersions")
    class GetQuestionGroupVersions {

        @Test
        @DisplayName("returns all versions ordered by version desc")
        void getVersions_returnsAll() {
            QuestionGroup v1 = buildGroup(1L, QuestionGroupType.VOCAB);
            QuestionGroup v2 = buildGroup(2L, QuestionGroupType.VOCAB);
            v2.setVersion(2);

            when(questionGroupRepository.findByUuidOrderByVersionDesc("uuid-1")).thenReturn(List.of(v2, v1));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(anyLong())).thenReturn(List.of());

            List<QuestionGroupResponseDTO> result = questionGroupService.getQuestionGroupVersions("uuid-1");

            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("throws when no versions found")
        void getVersions_notFound_throwsException() {
            when(questionGroupRepository.findByUuidOrderByVersionDesc("no-uuid")).thenReturn(List.of());

            assertThatThrownBy(() -> questionGroupService.getQuestionGroupVersions("no-uuid"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("no-uuid");
        }
    }

    // ── getQuestionGroupByVersion ────────────────────────────────────────────

    @Nested
    @DisplayName("getQuestionGroupByVersion")
    class GetQuestionGroupByVersion {

        @Test
        @DisplayName("returns correct version")
        void getByVersion_found_returnsDTO() {
            QuestionGroup g = buildGroup(1L, QuestionGroupType.VOCAB);
            g.setVersion(2);

            when(questionGroupRepository.findByUuidAndVersion("uuid-1", 2)).thenReturn(Optional.of(g));
            when(questionGroupQuestionRepository.findByGroupIdOrderByOrderAsc(1L)).thenReturn(List.of());

            QuestionGroupResponseDTO result = questionGroupService.getQuestionGroupByVersion("uuid-1", 2);

            assertThat(result.getVersion()).isEqualTo(2);
        }

        @Test
        @DisplayName("throws when version not found")
        void getByVersion_notFound_throwsException() {
            when(questionGroupRepository.findByUuidAndVersion("uuid-1", 99)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> questionGroupService.getQuestionGroupByVersion("uuid-1", 99))
                    .isInstanceOf(RuntimeException.class);
        }
    }

    // ── checkQuestionGroupUsage ──────────────────────────────────────────────

    @Nested
    @DisplayName("checkQuestionGroupUsage")
    class CheckQuestionGroupUsage {

        @Test
        @DisplayName("returns usage map with canEdit and canDelete keys")
        void checkUsage_existing_returnsMap() {
            when(questionGroupRepository.existsById(1L)).thenReturn(true);

            Map<String, Object> result = questionGroupService.checkQuestionGroupUsage(1L);

            assertThat(result).containsKeys("canEdit", "canDelete", "usageDetails");
        }

        @Test
        @DisplayName("throws when group not found")
        void checkUsage_notFound_throwsException() {
            when(questionGroupRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> questionGroupService.checkQuestionGroupUsage(99L))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("99");
        }
    }
}
