package edu.sdu.storygame.data.enums;

import lombok.Getter;

@Getter
public enum ResultCode {

    SUCCESS(200, "success"),

    BAD_REQUEST(40000, "请求参数错误"),
    LINE_INDEX_INVALID(40001, "剧情播放位置不合法"),
    CHOICE_REQUIRED(40002, "当前节点需要作出选择"),
    CHOICE_NOT_ALLOWED(40003, "当前节点不接受剧情选择"),
    REWIND_NOT_ALLOWED(40004, "无法回溯到指定剧情节点"),

    UNAUTHORIZED(40100, "未登录或登录态已失效"),
    TOKEN_INVALID(40101, "无效的令牌"),
    CAS_TOKEN_INVALID(40102, "统一认证令牌无效或已过期"),

    NOT_FOUND(40400, "资源不存在"),
    USER_NOT_FOUND(40401, "用户不存在"),
    CHAPTER_NOT_FOUND(40402, "章节不存在"),
    NODE_NOT_FOUND(40403, "剧情节点不存在"),
    CHOICE_NOT_FOUND(40404, "剧情选择不存在"),
    SAVE_NOT_FOUND(40405, "存档不存在"),

    STORY_STATE_CONFLICT(40901, "剧情状态已发生变化，请重新加载"),
    CHAPTER_FINISHED(40902, "当前章节已经结束"),
    SAVE_NAME_CONFLICT(40903, "存档名称已存在"),

    ERROR(50000, "服务器内部错误"),
    STORY_CONFIG_ERROR(50001, "剧情配置错误");


    private final Integer code;
    private final String msg;

    ResultCode(Integer code,String msg){
        this.code = code;
        this.msg = msg;
    }



}
