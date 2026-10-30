package edu.sdu.storygame.data.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 新建存档请求
 */
public record CreateGameSaveDTO(

        @NotBlank(message = "存档名称不能为空")
        @Size(max = 64, message = "存档名称不能超过64个字符")
        String saveName,

        @NotNull(message = "请选择人物故事")
        Long chapterId
) {
}