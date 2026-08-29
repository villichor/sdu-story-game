package edu.sdu.storygame.importer;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import edu.sdu.storygame.data.po.Achievement;
import edu.sdu.storygame.data.po.Chapter;
import edu.sdu.storygame.data.po.GameSave;
import edu.sdu.storygame.data.po.StoryChoice;
import edu.sdu.storygame.data.po.StoryLine;
import edu.sdu.storygame.data.po.StoryNode;
import edu.sdu.storygame.importer.StoryDefinition.AchievementDefinition;
import edu.sdu.storygame.importer.StoryDefinition.ChoiceDefinition;
import edu.sdu.storygame.importer.StoryDefinition.LineDefinition;
import edu.sdu.storygame.importer.StoryDefinition.NodeDefinition;
import edu.sdu.storygame.importer.StoryImportProperties.ImportMode;
import edu.sdu.storygame.mapper.AchievementMapper;
import edu.sdu.storygame.mapper.ChapterMapper;
import edu.sdu.storygame.mapper.GameSaveMapper;
import edu.sdu.storygame.mapper.StoryChoiceMapper;
import edu.sdu.storygame.mapper.StoryLineMapper;
import edu.sdu.storygame.mapper.StoryNodeMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 剧情配置导入业务
 * 导入分三遍完成：先节点，再跳转与选项，最后台词和成就
 * 整个过程位于一个事务中，任一步失败都会回滚
 */
@Service
@Profile("story-import")
@RequiredArgsConstructor
public class StoryImportService {

    private final ChapterMapper chapterMapper;
    private final StoryNodeMapper storyNodeMapper;
    private final StoryChoiceMapper storyChoiceMapper;
    private final StoryLineMapper storyLineMapper;
    private final AchievementMapper achievementMapper;
    private final GameSaveMapper gameSaveMapper;

    private final StoryGraphValidator validator = new StoryGraphValidator();

    @Transactional
    public ImportSummary importStory(StoryDefinition definition, ImportMode mode) {
        StoryGraphValidator.ValidationReport report = validator.validateOrThrow(definition);

        Chapter chapter = findChapter(definition.chapter().code());
        boolean replaced = chapter != null;

        if (chapter != null && mode == ImportMode.CREATE_ONLY) {
            throw new IllegalStateException(
                    "章节已存在，CREATE_ONLY 模式拒绝覆盖："
                            + definition.chapter().code()
            );
        }

        if (chapter == null) {
            chapter = new Chapter();
            applyChapterDefinition(chapter, definition);
            chapterMapper.insert(chapter);
        } else {
            ensureChapterHasNoSave(chapter.getId());
            clearChapterContent(chapter.getId());
            applyChapterDefinition(chapter, definition);
            chapterMapper.updateById(chapter);
        }

        Map<String, Long> nodeIdByCode = insertNodes(chapter.getId(), definition.nodes());
        updateLinearNextNodes(definition.nodes(), nodeIdByCode);
        int choiceCount = insertChoices(definition.nodes(), nodeIdByCode);
        int lineCount = insertLines(definition.nodes(), nodeIdByCode);
        int achievementCount = insertAchievements(
                chapter.getId(),
                definition.achievements(),
                nodeIdByCode
        );

        verifyImportedCounts(
                chapter.getId(),
                definition.nodes().size(),
                lineCount,
                choiceCount,
                achievementCount
        );

        return new ImportSummary(
                chapter.getId(),
                definition.chapter().code(),
                replaced,
                report.nodeCount(),
                report.lineCount(),
                report.choiceCount(),
                achievementCount,
                report.warnings()
        );
    }

    private Chapter findChapter(String chapterCode) {
        return chapterMapper.selectOne(
                Wrappers.<Chapter>lambdaQuery()
                        .eq(Chapter::getChapterCode, chapterCode)
                        .last("LIMIT 1")
        );
    }

    private void applyChapterDefinition(
            Chapter chapter,
            StoryDefinition definition
    ) {
        StoryDefinition.ChapterDefinition source = definition.chapter();
        chapter.setChapterCode(source.code());
        chapter.setTitle(source.title());
        chapter.setTheme(source.theme());
        chapter.setCharacter(source.characterName());
        chapter.setOrderIndex(source.orderIndex());
    }

    private void ensureChapterHasNoSave(Long chapterId) {
        Long saveCount = gameSaveMapper.selectCount(
                Wrappers.<GameSave>lambdaQuery()
                        .eq(GameSave::getChapterId, chapterId)
        );
        if (saveCount != null && saveCount > 0) {
            throw new IllegalStateException(
                    "目标章节已有玩家存档，禁止原地替换剧情图。chapterId=" + chapterId
            );
        }
    }

    /**
     * 已确认没有存档后，按外键依赖顺序清理旧内容。
     */
    private void clearChapterContent(Long chapterId) {
        List<StoryNode> oldNodes = storyNodeMapper.selectList(
                Wrappers.<StoryNode>lambdaQuery()
                        .eq(StoryNode::getChapterId, chapterId)
        );
        List<Long> nodeIds = oldNodes.stream().map(StoryNode::getId).toList();

        achievementMapper.delete(
                Wrappers.<Achievement>lambdaQuery()
                        .eq(Achievement::getChapterId, chapterId)
        );

        if (!nodeIds.isEmpty()) {
            storyLineMapper.delete(
                    Wrappers.<StoryLine>lambdaQuery()
                            .in(StoryLine::getNodeId, nodeIds)
            );
            storyChoiceMapper.delete(
                    Wrappers.<StoryChoice>lambdaQuery()
                            .in(StoryChoice::getFromNodeId, nodeIds)
            );
            storyNodeMapper.delete(
                    Wrappers.<StoryNode>lambdaQuery()
                            .eq(StoryNode::getChapterId, chapterId)
            );
        }
    }

    private Map<String, Long> insertNodes(
            Long chapterId,
            List<NodeDefinition> definitions
    ) {
        Map<String, Long> nodeIdByCode = new LinkedHashMap<>();
        for (NodeDefinition source : definitions) {
            StoryNode node = new StoryNode();
            node.setChapterId(chapterId);
            node.setNodeCode(source.code());
            node.setNodeType(source.type());
            node.setTitle(source.title());
            node.setBackgroundRef(source.backgroundRef());
            node.setCgRef(source.cgRef());
            node.setNextNodeId(null);
            node.setIsEntry(Boolean.TRUE.equals(source.entry()));
            node.setShowInStoryline(Boolean.TRUE.equals(source.showInStoryline()));
            node.setProgressPercent(source.progressPercent());
            storyNodeMapper.insert(node);
            nodeIdByCode.put(source.code(), node.getId());
        }
        return nodeIdByCode;
    }

    private void updateLinearNextNodes(
            List<NodeDefinition> definitions,
            Map<String, Long> nodeIdByCode
    ) {
        for (NodeDefinition source : definitions) {
            if (source.nextNodeCode() == null || source.nextNodeCode().isBlank()) {
                continue;
            }
            StoryNode update = new StoryNode();
            update.setId(requiredNodeId(nodeIdByCode, source.code()));
            update.setNextNodeId(requiredNodeId(nodeIdByCode, source.nextNodeCode()));
            storyNodeMapper.updateById(update);
        }
    }

    private int insertChoices(
            List<NodeDefinition> definitions,
            Map<String, Long> nodeIdByCode
    ) {
        int count = 0;
        for (NodeDefinition nodeDefinition : definitions) {
            Long fromNodeId = requiredNodeId(nodeIdByCode, nodeDefinition.code());
            for (ChoiceDefinition source : nodeDefinition.choices()) {
                StoryChoice choice = new StoryChoice();
                choice.setFromNodeId(fromNodeId);
                choice.setToNodeId(requiredNodeId(nodeIdByCode, source.toNodeCode()));
                choice.setChoiceCode(source.code());
                choice.setChoiceText(source.text());
                choice.setOrderIndex(source.orderIndex());
                storyChoiceMapper.insert(choice);
                count++;
            }
        }
        return count;
    }

    private int insertLines(
            List<NodeDefinition> definitions,
            Map<String, Long> nodeIdByCode
    ) {
        int count = 0;
        for (NodeDefinition nodeDefinition : definitions) {
            Long nodeId = requiredNodeId(nodeIdByCode, nodeDefinition.code());
            for (LineDefinition source : nodeDefinition.lines()) {
                StoryLine line = new StoryLine();
                line.setNodeId(nodeId);
                line.setLineType(source.lineType());
                line.setSpeaker(source.speaker());
                line.setContent(source.content());
                line.setPortraitRef(source.portraitRef());
                line.setEffectRef(source.effectRef());
                line.setRequiredChoiceCode(
                        source.condition() == null
                                ? null
                                : source.condition().requiredChoiceCode()
                );
                line.setOrderIndex(source.orderIndex());
                storyLineMapper.insert(line);
                count++;
            }
        }
        return count;
    }

    private int insertAchievements(
            Long chapterId,
            List<AchievementDefinition> definitions,
            Map<String, Long> nodeIdByCode
    ) {
        int count = 0;
        for (AchievementDefinition source : definitions) {
            Achievement achievement = new Achievement();
            achievement.setName(source.name());
            achievement.setDescription(source.description());
            achievement.setIcon(source.icon());
            achievement.setType(source.type());
            achievement.setChapterId(chapterId);
            achievement.setTriggerNodeId(
                    requiredNodeId(nodeIdByCode, source.triggerNodeCode())
            );
            achievement.setSouvenir(source.souvenir());
            achievementMapper.insert(achievement);
            count++;
        }
        return count;
    }

    private Long requiredNodeId(Map<String, Long> nodeIdByCode, String nodeCode) {
        Long nodeId = nodeIdByCode.get(nodeCode);
        if (nodeId == null) {
            throw new IllegalStateException("未找到已经导入的 nodeCode：" + nodeCode);
        }
        return nodeId;
    }

    private void verifyImportedCounts(
            Long chapterId,
            int expectedNodeCount,
            int expectedLineCount,
            int expectedChoiceCount,
            int expectedAchievementCount
    ) {
        List<StoryNode> nodes = storyNodeMapper.selectList(
                Wrappers.<StoryNode>lambdaQuery()
                        .eq(StoryNode::getChapterId, chapterId)
        );
        List<Long> nodeIds = nodes.stream().map(StoryNode::getId).toList();

        long actualLineCount = nodeIds.isEmpty() ? 0 : storyLineMapper.selectCount(
                Wrappers.<StoryLine>lambdaQuery().in(StoryLine::getNodeId, nodeIds)
        );
        long actualChoiceCount = nodeIds.isEmpty() ? 0 : storyChoiceMapper.selectCount(
                Wrappers.<StoryChoice>lambdaQuery()
                        .in(StoryChoice::getFromNodeId, nodeIds)
        );
        long actualAchievementCount = achievementMapper.selectCount(
                Wrappers.<Achievement>lambdaQuery()
                        .eq(Achievement::getChapterId, chapterId)
        );

        if (nodes.size() != expectedNodeCount
                || actualLineCount != expectedLineCount
                || actualChoiceCount != expectedChoiceCount
                || actualAchievementCount != expectedAchievementCount) {
            throw new IllegalStateException("剧情写入后的数量校验失败");
        }
    }

    public record ImportSummary(
            Long chapterId,
            String chapterCode,
            boolean replaced,
            int nodeCount,
            int lineCount,
            int choiceCount,
            int achievementCount,
            List<String> warnings
    ) {
    }
}
