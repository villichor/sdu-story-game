package edu.sdu.storygame.data.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 剧情回溯请求
 * @param expectedCurrentPathId 客户端认为的当前路径记录 ID
 * @param targetPathId          要回溯到的历史路径记录 ID
 */
public record RewindStoryDTO(

        @NotNull(message = "当前路径记录ID不能为空")
        @Positive(message = "当前路径记录ID必须大于0")
        Long expectedCurrentPathId,

        @NotNull(message = "目标路径记录ID不能为空")
        @Positive(message = "目标路径记录ID必须大于0")
        Long targetPathId
) {
}