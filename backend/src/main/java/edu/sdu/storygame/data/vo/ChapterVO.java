package edu.sdu.storygame.data.vo;

public record ChapterVO(
        Long id,
        String title,
        String theme,
        String character,
        Integer orderIndex
) {
}