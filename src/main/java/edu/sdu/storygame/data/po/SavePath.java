package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 存档路径记录
 * 每进入一个新节点，就在该表新增一条记录，用于记录和剧情回溯
 */
@Data
@TableName("save_path")
public class SavePath {

    @TableId(type = IdType.AUTO)
    private Long id;
    // 所属存档
    private Long saveId;
    // 非选择节点为null
    private Long choiceId;
    private Long nodeId;
    private Integer stepIndex;
    //是否为有效路径
    private Boolean isActive;
    private LocalDateTime visitedAt;
}