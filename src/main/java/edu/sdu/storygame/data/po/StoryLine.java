package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 节点内部的播放内容
 */
@Data
@TableName("story_line")
public class StoryLine {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long nodeId;
    /**
     * 播放类型：
     * dialogue  角色对话
     * narration 旁白
     * effect    特效指令
     */
    private String lineType;
    private String speaker;
    // 文本
    private String content;
    // 角色立绘或表情资源标识
    private String portraitRef;

    /**
     * 特效标识
     * FADE_OUT
     * FADE_IN
     * PAUSE
     */
    private String effectRef;
    // 台词依赖的选择编码，null时展示台词，有值时路径包含该choiceCode展示台词
    private String requiredChoiceCode;
    // 在当前节点内的播放顺序。
    private Integer orderIndex;
}