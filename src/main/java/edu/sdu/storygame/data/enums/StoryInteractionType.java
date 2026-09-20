package edu.sdu.storygame.data.enums;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 当前剧情页面的交互状态
 */
public enum StoryInteractionType {
    // 当前节点仍有台词尚未播放
    PLAYING("playing"),
    // 台词播放完毕，可以沿next_node_id线性推进
    LINEAR("linear"),
    // 台词播放完毕，需要玩家选择一个选项
    CHOICE("choice"),
    // 当前人物故事已经结束
    FINISHED("finished");

    private final String value;

    StoryInteractionType(String value) {
        this.value = value;
    }
    /**
     * 返回给前端JSON
     */
    @JsonValue
    public String getValue() {
        return value;
    }
}