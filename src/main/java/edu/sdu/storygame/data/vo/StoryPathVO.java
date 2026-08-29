package edu.sdu.storygame.data.vo;

import java.util.List;

/**
 * 当前存档实际走过的剧情路径
 *
 * @param saveId        存档 ID
 * @param chapterId     人物故事章节 ID
 * @param currentPathId 当前有效路径记录 ID
 * @param currentNodeId 当前剧情节点 ID
 * @param nodes         按顺序排列的路径节点
 */
public record StoryPathVO(
        Long saveId,
        Long chapterId,
        Long currentPathId,
        Long currentNodeId,
        List<StoryPathNodeVO> nodes
) {
}