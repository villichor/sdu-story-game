package edu.sdu.storygame.data.vo;

import edu.sdu.storygame.data.enums.StoryInteractionType;

import java.util.List;

/**
 * 更新台词位置后的剧情状态，只返回位置更新后前端需要的信息
 * @param saveId          存档 ID
 * @param nodeId          当前节点 ID
 * @param currentLineIndex 更新后的台词位置
 * @param interactionType 更新后的交互状态
 * @param choices         当前允许展示的选项
 * @param unlockedAchievements 交互后新解锁的成就，可null，玩家播放完 trigger_node_id 对应节点的最后一句台词时解锁成就
 */
public record StoryPositionVO(
        Long saveId,
        Long nodeId,
        Integer currentLineIndex,
        StoryInteractionType interactionType,
        List<StoryChoiceVO> choices,
        List<AchievementUnlockVO> unlockedAchievements
) {
}
// 最后一句播放完后
// 线性节点返回 linear
// 选择节点返回 choice 和选项
// 结局节点返回 finished