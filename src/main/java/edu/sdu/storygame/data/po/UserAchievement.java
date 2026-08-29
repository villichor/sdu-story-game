package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户解锁成就记录
 */
@Data
@TableName("user_achievement")
public class UserAchievement {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long achievementId;
    private LocalDateTime unlockedAt;
}