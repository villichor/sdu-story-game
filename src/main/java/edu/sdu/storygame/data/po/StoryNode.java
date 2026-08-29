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
 * 一个节点表示两次剧情跳转之间的一段连续剧情
 * 节点内部的具体台词、旁白和特效存放在 story_line 表中。
 */
@Data
@TableName("story_node")
public class StoryNode {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long chapterId;

    /**
     * 稳定业务标识。
     * 例如：
     * PROLOGUE_MUSEUM
     * ACT1_DIRECTION_CHOICE
     * ROUTE_A_END
     */
    private String nodeCode;

    /**
     * 节点类型：
     * normal      普通剧情节点
     * route_end   路线收束节点
     * chapter_end 章节最终节点
     */
    private String nodeType;

    // 节点标题或场景名称
    private String title;
    // 背景资源标识
    private String backgroundRef;
    // CG资源标识
    private String cgRef;

    /**
     * 没有玩家选项时自动进入的下一节点
     * 如果当前节点存在 story_choice，不使用该字段
     */
    private Long nextNodeId;

    // 是否为入口
    private Boolean isEntry;

    /**
     * 是否在故事线界面可视化中显示
     * 普通逐句对话节点不显示，关键选择、历史事件和路线收束节点显示
     */
    private Boolean showInStoryline;

    // 存档总进度，0-100
    private Integer progressPercent;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}