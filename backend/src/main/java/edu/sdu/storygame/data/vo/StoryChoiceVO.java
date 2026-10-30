package edu.sdu.storygame.data.vo;

/**
 * 当前节点可供玩家选择的剧情选项。
 *
 * @param id         选项 ID，推进剧情时作为 choiceId 提交
 * @param choiceCode 稳定选项编码，用于剧情回调和内容识别
 * @param choiceText 展示给玩家的选项文案
 * @param orderIndex 选项显示顺序
 */
public record StoryChoiceVO(
        Long id,
        String choiceCode,
        String choiceText,
        Integer orderIndex
) {
}