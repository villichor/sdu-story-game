package edu.sdu.storygame.data.enums;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 当前剧情页面的交互状态。
 */
public enum StoryInteractionType {

    /**
     * 当前节点仍有台词尚未播放。
     */
    PLAYING("playing"),

    /**
     * 台词播放完毕，可以沿 next_node_id 线性推进。
     */
    LINEAR("linear"),

    /**
     * 台词播放完毕，需要玩家选择一个选项。
     */
    CHOICE("choice"),

    /**
     * 当前人物故事已经结束。
     */
    FINISHED("finished");

    private final String value;

    StoryInteractionType(String value) {
        this.value = value;
    }

    /**
     * 控制返回给前端的JSON
     * 例如 PLAYING 会被序列化为 "playing"。
     */
    @JsonValue
    public String getValue() {
        return value;
    }
}