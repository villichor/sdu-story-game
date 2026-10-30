package edu.sdu.storygame.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.JsonNode;
import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.po.User;
import edu.sdu.storygame.exception.BusinessException;
import edu.sdu.storygame.mapper.UserMapper;
import edu.sdu.storygame.util.AppJwtUtil;
import edu.sdu.storygame.util.CasJwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final AppJwtUtil appJwtUtil;
    private final RestClient restClient;

    @Value("${app.cas.base-url}")
    private String casBaseUrl;

    @Value("${app.cas.jwt-secret}")
    private String casJwtSecret;

    /**
     * 游客登录：直接建一个游客用户并签发登录态
     */
    public String guestLogin() {
        User user = new User();
        user.setIsGuest(true);
        user.setUsername("游客" + System.currentTimeMillis() % 100000);
        userMapper.insert(user);
        return appJwtUtil.generate(user.getId());
    }

    /**
     * 统一认证登录
     * 用回调拿到的一次性 code，换取官方JWT，验签得到学号姓名，查/建用户，签发登录态
     * @param code 回调 URL 上的一次性授权码（60 秒、只能用一次）
     * @return 本服务的JWT
     */
    @Transactional(rollbackFor = Exception.class)
    public String casLoginByCode(String code) {
        // 调用官方/auth/token换取JWT
        String casJwt = exchangeToken(code);
        // 验签
        String[] parsed = CasJwtUtil.parse(casJwt, casJwtSecret);
        if (parsed == null) {
            throw new BusinessException(ResultCode.CAS_TOKEN_INVALID);
        }
        String casId = parsed[0];
        String name = parsed[1];

        return upsertAndIssue(casId,name);
    }

    /**
     * mock用
     */
    @Transactional(rollbackFor = Exception.class)
    public String casLoginMock(String casId, String name) {
        return upsertAndIssue(casId, name);
    }

    /**
     * 调用官方 POST /auth/token,从响应data.token取出JWT
     */
    private String exchangeToken(String code) {
        try {
            // 官方响应形如 { "code":200, "msg":"success", "data":{ ..., "token":"JWT" }, "timestamp":... }
            JsonNode body = restClient.post()
                    .uri(casBaseUrl + "/auth/token")
                    .header("Content-Type", "application/json")
                    .body(Map.of("code", code))
                    .retrieve()
                    .body(JsonNode.class);

            if (body == null || body.path("data").path("token").isMissingNode()) {
                log.warn("统一认证换取token失败，响应异常: {}", body);
                throw new BusinessException(ResultCode.CAS_TOKEN_INVALID);
            }
            return body.path("data").path("token").asText();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            // 网络异常、code过期/重复使用
            log.warn("调用统一认证换取 token 接口异常", e);
            throw new BusinessException(ResultCode.CAS_TOKEN_INVALID);
        }
    }

    public String upsertAndIssue(String casId,String name) {
        User user = userMapper.selectOne(
                Wrappers.<User>lambdaQuery().eq(User::getStudentId,casId));

        if (user == null) {
            user = new User();
            user.setIsGuest(false);
            user.setStudentId(casId);
            user.setUsername(name != null ? name : casId);
            userMapper.insert(user);
        }
        return appJwtUtil.generate(user.getId());
    }
}
