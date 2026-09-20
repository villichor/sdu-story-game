package edu.sdu.storygame.data.po;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 玩家在剧情节点中可以作出的选择,图中的一条有向边
 * fromNodeId -> toNodeId。
 */
@Data
@TableName("story_choice")
public class StoryChoice {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long fromNodeId;
    private Long toNodeId;
    /**
     * 稳定业务标识
     * 例如：
     * FOOD_NOODLES
     * ROUTE_A
     * PROOF_SIEVE
     */
    private String choiceCode;
    // 选项文案
    private String choiceText;
    // 选项显示顺序
    private Integer orderIndex;
}