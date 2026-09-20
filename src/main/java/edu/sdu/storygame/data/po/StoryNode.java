package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 剧情节点
 */
@Data
@TableName("story_node")
public class StoryNode {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long chapterId;
    private String nodeCode;
    /**
     * 节点类型：
     * normal      普通剧情节点
     * route_end   路线收束节点
     * chapter_end 章节最终节点
     */
    private String nodeType;
    private String title;
    // 背景资源标识
    private String backgroundRef;
    // CG资源标识
    private String cgRef;
    // 没有玩家选项时自动进入的下一节点,如果当前节点存在story_choice，不使用该字段
    private Long nextNodeId;
    private Boolean isEntry;
    // 是否在故事线界面可视化中显示,普通逐句对话节点不显示
    private Boolean showInStoryline;
    // 存档总进度，0-100
    private Integer progressPercent;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}