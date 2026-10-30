package edu.sdu.storygame.data.vo;

import java.time.LocalDateTime;

/**
 * 成就页面展示信息
 * @param id          成就 ID
 * @param name        成就名称
 * @param description 成就描述
 * @param icon        图标或 emoji
 * @param type        成就类型
 * @param chapterId   关联章节
 * @param souvenir    纪念物
 * @param unlocked    当前用户是否已经解锁
 * @param unlockedAt  解锁时间
 */
public record AchievementVO(
        Long id,
        String name,
        String description,
        String icon,
        String type,
        Long chapterId,
        String souvenir,
        Boolean unlocked,
        LocalDateTime unlockedAt
) {
}