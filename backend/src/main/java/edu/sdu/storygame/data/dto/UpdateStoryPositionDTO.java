package edu.sdu.storygame.data.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 用于更新剧情台词位置请求
 *
 * @param expectedNodeId    客户端认为存档当前所在的节点 ID
 * @param expectedLineIndex 客户端认为存档当前的台词位置
 * @param targetLineIndex   本次更新后的台词位置
 */
public record UpdateStoryPositionDTO(

        @NotNull(message = "当前节点ID不能为空")
        @Positive(message = "当前节点ID必须大于0")
        Long expectedNodeId,

        @NotNull(message = "原台词位置不能为空")
        @Min(value = 0, message = "原台词位置不能小于0")
        Integer expectedLineIndex,

        @NotNull(message = "目标台词位置不能为空")
        @Min(value = 1, message = "目标台词位置不能小于1")
        Integer targetLineIndex
) {
}