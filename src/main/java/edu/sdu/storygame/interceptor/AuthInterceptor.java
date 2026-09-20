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
 * 登录态拦截器
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final AppJwtUtil appJwtUtil;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        // CORS preflight carries no login token and must reach Spring's CORS handler.
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

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
