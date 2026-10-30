package edu.sdu.storygame.data.vo;

import edu.sdu.storygame.data.enums.StoryInteractionType;

/**
 * 当前存档的剧情状态
 *
 * @param saveId           存档 ID
 * @param chapterId        所属人物故事章节 ID
 * @param currentLineIndex 下一句待播放台词的数组下标
 * @param completionRate   当前人物故事完成度
 * @param interactionType  当前页面应执行的交互类型
 * @param node             当前剧情节点
 */
public record CurrentStoryVO(
        Long saveId,
        Long chapterId,
        Integer currentLineIndex,
        Integer completionRate,
        StoryInteractionType interactionType,
        StoryNodeVO node
) {
}