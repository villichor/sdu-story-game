package edu.sdu.storygame.exception;

import edu.sdu.storygame.data.enums.ResultCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final ResultCode resultCode;


    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMsg());
        this.resultCode = resultCode;
    }

    //自定义补充错误信息，比如"用户 xxx 不存在"
    public BusinessException(ResultCode resultCode, String customMsg) {
        super(customMsg);
        this.resultCode = resultCode;
    }

    public String getMsg(){
        return getMessage();
    }

}