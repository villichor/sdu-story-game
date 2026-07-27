package edu.sdu.storygame.data.enums;

import lombok.Getter;

@Getter
public enum ResultCode {

    SUCCESS(200, "success"),

    BAD_REQUEST(40000, "请求参数错误"),

    UNAUTHORIZED(40100, "未登录或登录态已失效"),
    TOKEN_INVALID(40101, "无效的令牌"),
    CAS_TOKEN_INVALID(40102, "统一认证令牌无效或已过期"),

    NOT_FOUND(40400, "资源不存在"),
    USER_NOT_FOUND(40401, "用户不存在"),

    ERROR(50000, "服务器内部错误");


    private final Integer code;
    private final String msg;

    ResultCode(Integer code,String msg){
        this.code = code;
        this.msg = msg;
    }



}
