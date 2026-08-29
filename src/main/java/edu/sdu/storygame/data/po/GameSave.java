package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 游戏存档
 */
@Data
@TableName("game_save")
public class GameSave {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String saveName;
    private Long chapterId;
    private Long currentNodeId;
    //当前节点已经播放到的位置
    private Integer currentLineIndex;
    // 当前存档的总游戏完成度，范围 0-100
    private Integer completionRate;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}