package edu.sdu.storygame.data.vo;

import java.util.List;

/**
 * 当前剧情节点
 * 不向前端返回 nextNodeId 和选项的 toNodeId，
 * 节点跳转完全由后端控制。
 *
 * @param id            节点 ID
 * @param nodeCode      章节内稳定节点编码
 * @param nodeType      节点类型：normal、route_end、chapter_end
 * @param title         节点标题
 * @param backgroundRef 背景资源引用
 * @param cgRef         CG 资源引用
 * @param lines         当前节点的全部台词，已按播放顺序排列
 * @param choices       当前允许展示的选项；未播放完台词时为空数组
 */
public record StoryNodeVO(
        Long id,
        String nodeCode,
        String nodeType,
        String title,
        String backgroundRef,
        String cgRef,
        List<StoryLineVO> lines,
        List<StoryChoiceVO> choices
) {
}