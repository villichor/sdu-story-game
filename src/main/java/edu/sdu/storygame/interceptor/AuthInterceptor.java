package edu.sdu.storygame.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.sdu.storygame.context.UserContext;
import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.vo.Result;
import edu.sdu.storygame.util.AppJwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录态拦截器：校验请求头 Authorization: Bearer <token>。
 * 通过则把 userId 存进 UserContext（ThreadLocal），业务里直接 UserContext.getUserId() 取。
 * 请求结束后在 afterCompletion 里清理，防止线程复用串号。
 *
 * 说明：拦截器在 controller 之前执行，@RestControllerAdvice 兜不住这里的异常，
 *       所以未登录时直接写回统一的 Result JSON，而不是 throw。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final AppJwtUtil appJwtUtil;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            writeUnauthorized(response);
            return false;
        }
        String token = header.substring(7);
        Long userId = appJwtUtil.parseUserId(token);
        if (userId == null) {
            writeUnauthorized(response);
            return false;
        }
        UserContext.setUserId(userId);   // 存入当前线程上下文
        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                @NonNull Object handler, Exception e) {
        UserContext.clear();
    }

    /** 写回统一格式的 401 响应 */
    private void writeUnauthorized(HttpServletResponse response) throws Exception {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        Result<Void> body = Result.error(ResultCode.UNAUTHORIZED);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
