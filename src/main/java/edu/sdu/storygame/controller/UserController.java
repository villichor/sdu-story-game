package edu.sdu.storygame.controller;

import edu.sdu.storygame.dto.R;
import edu.sdu.storygame.entity.User;
import edu.sdu.storygame.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 示例：需要登录才能访问的接口。用于验证拦截器 + 登录态是否打通。
 * 拿登录返回的 token，在请求头加 Authorization: Bearer <token> 访问 /api/user/me。
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserMapper userMapper;

    @GetMapping("/me")
    public R<User> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");   // 拦截器放进来的
        User user = userMapper.selectById(userId);
        return R.ok(user);
    }
}
