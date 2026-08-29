package edu.sdu.storygame.importer;

import java.util.List;

/**
 * 剧情 JSON 的内存模型
 * JSON 中只使用稳定业务编码，不依赖任何环境中的数据库自增 ID
 */
public record StoryDefinition(
        Integer schemaVersion,
        ChapterDefinition chapter,
        List<AchievementDefinition> achievements,
        List<NodeDefinition> nodes
) {
    public StoryDefinition {
        achievements = achievements == null ? List.of() : List.copyOf(achievements);
        nodes = nodes == null ? List.of() : List.copyOf(nodes);
    }

    public record ChapterDefinition(
            String code,
            String title,
            String theme,
            String characterName,
            Integer orderIndex
    ) {
    }

    public record AchievementDefinition(
            String code,
            String name,
            String description,
            String icon,
            String type,
            String souvenir,
            String triggerType,
            String triggerNodeCode
    ) {
    }

    public record NodeDefinition(
            String code,
            String type,
            String title,
            Boolean entry,
            Boolean showInStoryline,
            Integer progressPercent,
            String backgroundRef,
            String cgRef,
            String nextNodeCode,
            List<LineDefinition> lines,
            List<ChoiceDefinition> choices
    ) {
        public NodeDefinition {
            lines = lines == null ? List.of() : List.copyOf(lines);
            choices = choices == null ? List.of() : List.copyOf(choices);
        }
    }

    public record LineDefinition(
            String code,
            String lineType,
            String speaker,
            String content,
            String portraitRef,
            String effectRef,
            Integer orderIndex,
            LineCondition condition
    ) {
    }

    public record LineCondition(String requiredChoiceCode) {
    }

    public record ChoiceDefinition(
            String code,
            String text,
            String effect,
            String toNodeCode,
            Integer orderIndex
    ) {
    }
}
