package edu.sdu.storygame.data.vo;

/**
 * 用于实时弹出成就
 * @param id          成就 ID
 * @param name        成就名称
 * @param description 成就描述
 * @param icon        图标或 emoji
 * @param type        成就类型
 * @param souvenir    纪念物
 */
public record AchievementUnlockVO(
        Long id,
        String name,
        String description,
        String icon,
        String type,
        String souvenir
) {
}