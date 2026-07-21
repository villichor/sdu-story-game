package edu.sdu.storygame.controller;

import edu.sdu.storygame.dto.R;
import edu.sdu.storygame.service.AuthService;
import edu.sdu.storygame.util.CasJwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cas.shared-key}")
    private String casSharedKey;

    @Value("${app.cas.frontend-url}")
    private String frontendUrl;

    @Value("${app.cas.mock-enabled}")
    private boolean mockEnabled;

    /**
     * 游客登录。前端 POST 调用，直接拿到我们系统的 JWT。
     */
    @PostMapping("/guest")
    public R<Map<String, String>> guestLogin() {
        String token = authService.guestLogin();
        return R.ok(Map.of("token", token));
    }

    /**
     * 统一认证回调接口。
     * 学长的代理认证成功后，会把用户重定向到这里，并在 URL 上拼一个 token 参数。
     * 这里解开它拿到学号 → 查/建用户 → 签发我们自己的 JWT → 重定向回前端页面。
     *
     * 前端应引导用户访问：
     *   https://i.sdu.edu.cn/cas/proxy/login/page?forward=[本接口URL编码后]
     */
    @GetMapping("/cas/callback")
    public void casCallback(@RequestParam(required = false) String token,
                            HttpServletResponse response) throws IOException {
        String casId;
        String name;

        if (mockEnabled) {
            // ===== 本地开发：不验真 token，直接放行一个测试学号 =====
            casId = "202400000000";
            name = "测试用户";
        } else {
            // ===== 生产：真解析学长传来的 10 秒 token =====
            String[] parsed = CasJwtUtil.parse(token, casSharedKey);
            if (parsed == null) {
                // token 非法/过期：跳回前端并带上错误标记
                response.sendRedirect(frontendUrl + "?error=invalid_token");
                return;
            }
            casId = parsed[0];
            name = parsed[1];
        }

        // 查/建用户，签发我们自己的登录态
        String appToken = authService.casLogin(casId, name);

        // 重定向回前端，把我们的 JWT 拼在 URL 上（前端从 URL 取出存起来）
        String encoded = URLEncoder.encode(appToken, StandardCharsets.UTF_8);
        response.sendRedirect(frontendUrl + "?token=" + encoded);
    }
}
