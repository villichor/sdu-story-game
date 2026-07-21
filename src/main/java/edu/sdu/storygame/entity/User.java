package edu.sdu.storygame.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户表：同时容纳游客与统一认证账号
 */
@Data
@TableName("user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String username;          // 用户名/昵称，如"游客001"

    private Boolean isGuest;          // 是否游客

    private String studentId;         // 学号（统一认证用户才有）

    private String passwordHash;      // 密码散列（接统一认证后可弃用）

    private String avatarUrl;

    private Integer progressRate;     // 总进度 0-100

    private Integer unlockedStoryCount;

    private Integer achievementCount;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
