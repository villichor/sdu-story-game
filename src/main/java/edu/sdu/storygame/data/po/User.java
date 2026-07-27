package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 同时容纳游客与统一认证账号
 */
@Data
@TableName("user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;          // 用户名
    private Boolean isGuest;          // 是否是游客
    private String studentId;         // 学号
    private String passwordHash;      // 密码散列（接统一认证后可弃用）
    private String avatarUrl;
    private Integer progressRate;     // 总进度0-100
    private Integer unlockedStoryCount;
    private Integer achievementCount;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
