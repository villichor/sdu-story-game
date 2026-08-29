package edu.sdu.storygame.data.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 用于统一剧情推进接口
 *  * @param expectedNodeId    客户端认为存档当前所在节点
 *  * @param expectedLineIndex 客户端认为当前台词位置
 *  * @param choiceId          线性推进时为 null，选择推进时为玩家选择的 choiceId
 */
public record AdvanceStoryDTO(
        @NotNull(message = "当前节点ID不能为空")
        @Positive(message = "当前节点ID必须大于0")
        Long expectedNodeId,

        @NotNull(message = "当前台词位置不能为空")
        @Min(value = 0, message = "当前台词位置不能小于0")
        Integer expectedLineIndex,

        @Positive(message = "选项ID必须大于0")
        Long choiceId
) {
}
