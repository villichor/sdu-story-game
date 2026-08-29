package edu.sdu.storygame.data.vo;

import java.time.LocalDateTime;

/**
 * 玩家故事路径中的一个剧情节点
 *
 * @param pathId          路径记录 ID，回溯时作为 targetPathId
 * @param stepIndex       路径步骤序号
 * @param nodeId          剧情节点 ID
 * @param nodeCode        稳定节点编码
 * @param nodeType        节点类型
 * @param title           节点标题
 * @param progressPercent 节点对应完成度
 * @param choiceCode      到达该节点时所作选择的稳定编码
 * @param choiceText      到达该节点时所作选择的文案
 * @param visitedAt       到达该节点的时间
 * @param current         是否为当前路径位置
 */
public record StoryPathNodeVO(
        Long pathId,
        Integer stepIndex,
        Long nodeId,
        String nodeCode,
        String nodeType,
        String title,
        Integer progressPercent,
        String choiceCode,
        String choiceText,
        LocalDateTime visitedAt,
        Boolean current
) {
}