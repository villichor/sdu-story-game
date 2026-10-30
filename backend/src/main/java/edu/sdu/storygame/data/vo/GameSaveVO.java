package edu.sdu.storygame.data.vo;

import java.time.LocalDateTime;

/**
 * 新建存档响应，列表，删除前确认
 */
public record GameSaveVO(
        Long id,
        String saveName,

        Long chapterId,
        String chapterTitle,
        String character,

        Long currentNodeId,
        String currentNodeTitle,

        Integer currentLineIndex,
        Integer completionRate,

        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}