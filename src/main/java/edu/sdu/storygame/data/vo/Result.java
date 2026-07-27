package edu.sdu.storygame.data.vo;


import edu.sdu.storygame.data.enums.ResultCode;

public record Result<T> (
        Integer code, // 业务状态码
        T data, // 数据
        String msg // 提示信息
) {

    /**
     * 返回成功结果
     */
    public static <T> Result<T> success(T data, String msg) {
        return new Result<>(200, data, msg);
    }

    public static <T> Result<T> success(T data) {
        return new Result<>(200, data, "success");
    }

    /**
     * 返回成功（无数据）
     */
    public static Result<Void> success() {
        return new Result<>(200, null, "success");
    }

    /**
     * 配合自定义异常枚举使用
     */
    public static <T> Result<T> error(ResultCode resultCode){
        return new Result<>(resultCode.getCode(),null,resultCode.getMsg());
    }

    /**
     * 返回错误结果
     */
    public static <T> Result<T> error(ResultCode resultCode, String msg) {
        return new Result<>(resultCode.getCode(), null, msg);
    }

    public static <T> Result<T> error(ResultCode resultCode, T data, String msg) {
        return new Result<>(resultCode.getCode(), data, msg);
    }

    public boolean isSuccess() {
        return this.code != null && this.code == 200;
    }
}