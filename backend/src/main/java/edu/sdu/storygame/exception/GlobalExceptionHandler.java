package edu.sdu.storygame.exception;


import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.vo.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器。controller 抛出的异常统一在这里转成 Result。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    /**
     * 处理业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public <T> Result<Void> handleBizException(BusinessException be) {
        log.warn("业务异常 | 业务码：{} | 信息：{}", be.getResultCode().getCode(), be.getResultCode().getMsg());
        return Result.error(be.getResultCode(), be.getMessage());
    }


    /** 参数校验异常（@Valid 不通过），取第一条错误信息 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValid(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String msg = fieldError != null ? fieldError.getDefaultMessage() : "参数校验失败";
        return Result.error(ResultCode.BAD_REQUEST, msg);
    }

    /** 兜底：其他未预期异常，打完整堆栈 */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleUnexpected(Exception e) {
        log.error("未预期异常", e);
        return Result.error(ResultCode.ERROR);
    }
}
