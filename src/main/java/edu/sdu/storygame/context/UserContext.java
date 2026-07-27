package edu.sdu.storygame.context;

import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.exception.BusinessException;

/**
 * 当前登录用户上下文，基于 ThreadLocal。
 */
public class UserContext {

    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();

    private UserContext() {}

    public static void setUserId(Long userId) {
        USER_ID.set(userId);
    }


    public static Long getUserId() {
        return USER_ID.get();
    }

    public static void clear() {
        USER_ID.remove();
    }

    public static Long getUserIdRequired() {
        Long userId = USER_ID.get();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }
        return userId;
    }
}
