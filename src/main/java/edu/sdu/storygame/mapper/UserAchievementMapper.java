package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.UserAchievement;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserAchievementMapper
        extends BaseMapper<UserAchievement> {

    /**
     * 尝试写入用户成就
     * INSERT IGNORE 配合数据库唯一索引：
     * UNIQUE (user_id, achievement_id)
     * 保证重复请求和并发请求不会重复解锁。
     *
     * @param userId        用户 ID
     * @param achievementId 成就 ID
     * @return 1 表示本次新解锁，0 表示此前已经解锁
     */
    @Insert("""
            INSERT IGNORE INTO user_achievement (
                user_id,
                achievement_id,
                unlocked_at
            )
            VALUES (
                #{userId},
                #{achievementId},
                CURRENT_TIMESTAMP
            )
            """)
    int insertIgnore(
            @Param("userId") Long userId,
            @Param("achievementId") Long achievementId
    );
}