package edu.sdu.storygame.data.po;


import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 游戏章节
 * 一个章节作为一个人物故事
 */
@Data
@TableName("chapter")
public class Chapter {

    @TableId(type = IdType.AUTO)
    private Long id;

    // 稳定业务标识，用于剧情配置导入与版本管理
    private String chapterCode;

    private String title;
    // 主题
    private String theme;
    // 主角
    @TableField("`character`")
    private String character;
    // 章节显示顺序
    private Integer orderIndex;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
