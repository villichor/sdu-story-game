package edu.sdu.storygame.controller;

import edu.sdu.storygame.data.vo.Result;
import edu.sdu.storygame.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.cas.frontend-url}")
    private String frontendUrl;

    @Value("${app.cas.mock-enabled}")
    private boolean mockEnabled;

    /**
     * 游客登录。前端 POST 调用，直接拿到我们系统的 JWT。
     */
    @PostMapping("/guest")
    public Result<Map<String, String>> guestLogin() {
        String token = authService.guestLogin();
        return Result.success(Map.of("token", token));
    }

    /**
     * 统一认证回调接口（Pass 平台 JWT 方式）。
     *
     * 完整链路：
     *   1) 前端引导用户跳转到官方登录入口：
     *        https://i.sdu.edu.cn/pass-api/login/page?forward=[本接口地址URL编码]
     *   2) 用户在官方页登录成功后，官方将用户重定向回此接口，URL中带有临时凭证code，expiration = 60s
     *   3) 本接口拿code交给service：调用官方/auth/token 拿到JWT → 验签得到学号姓名 → 查/建用户 → 签发登录态
     *   4) 携带JWT重定向回前端页面
     *
     * 注意：这是浏览器重定向落地的接口，不是给前端 ajax 调的，
     *       所以直接操作 HttpServletResponse 做重定向，而不是返回 Result。
     */
    @GetMapping("/cas/callback")
    public void casCallback(@RequestParam(required = false) String code,
                            HttpServletResponse response) throws IOException {

        String appToken;

        if (mockEnabled) {
            // 本地开发 跳过官方交互，直接放行一个测试学号
            appToken = authService.casLoginMock("202400000000", "测试用户");
        } else {
            // 正式流程，必须带授权码code
            if (code == null || code.isBlank()) {
                response.sendRedirect(frontendUrl + "?error=missing_code");
                return;
            }
            try {
                appToken = authService.casLoginByCode(code);
            } catch (Exception e) {
                // code 过期/重复使用/换取失败等，跳回前端带错误标记
                log.warn("统一认证登录失败", e);
                response.sendRedirect(frontendUrl + "?error=cas_login_failed");
                return;
            }
        }

        // 携带自己的 JWT 重定向回前端
        String encoded = URLEncoder.encode(appToken, StandardCharsets.UTF_8);
        response.sendRedirect(frontendUrl + "?token=" + encoded);
    }
}
