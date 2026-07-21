package edu.sdu.storygame.interceptor;

import edu.sdu.storygame.util.AppJwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录态拦截器：从请求头 Authorization: Bearer <token> 取出并校验我们自己的 JWT。
 * 校验通过则把 userId 放进 request 属性，业务里可直接取。
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final AppJwtUtil appJwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            response.setStatus(401);
            return false;
        }
        String token = header.substring(7);
        Long userId = appJwtUtil.parseUserId(token);
        if (userId == null) {
            response.setStatus(401);
            return false;
        }
        request.setAttribute("userId", userId);   // 业务里用 request.getAttribute("userId") 取当前用户
        return true;
    }
}
