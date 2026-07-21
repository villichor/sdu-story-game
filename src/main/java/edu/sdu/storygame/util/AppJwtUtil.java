package edu.sdu.storygame.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * 我们自己系统的登录态 JWT —— 用户登录后签发，之后每个请求带它，拦截器校验。
 * 这把密钥与统一认证那把 shared-key 完全无关，是我们自己的。
 */
@Component
public class AppJwtUtil {

    private final SecretKey secretKey;
    private final long expire;

    public AppJwtUtil(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expire}") long expire) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expire = expire;
    }

    /** 登录成功后签发，userId 放进 subject */
    public String generate(Long userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expire))
                .signWith(secretKey)
                .compact();
    }

    /** 校验并取出 userId；失败返回 null */
    public Long parseUserId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }
}
