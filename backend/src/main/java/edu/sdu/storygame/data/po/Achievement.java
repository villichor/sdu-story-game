package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("achievement")
public class Achievement {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String description;
    // 图标或emoji
    private String icon;
    // 成就类型：chapter、route、global
    private String type;
    // 关联的章节
    private Long chapterId;
    // 触发成就节点
    private Long triggerNodeId;
    private String souvenir;
    private LocalDateTime createdAt;
}