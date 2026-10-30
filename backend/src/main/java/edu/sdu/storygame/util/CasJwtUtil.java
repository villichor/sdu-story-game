package edu.sdu.storygame.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;

import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 解析统一认证 Pass 平台换回的 JWT。
 *
 * 官方文档规定：控制台给的「JWT 密钥」不能直接当 HS256 key，必须先按下列参数
 * 用 PBKDF2 派生出真正的签名密钥，再做 HS256 验签。以下常量必须与官方一致：
 *   - 派生算法 PBKDF2WithHmacSHA256
 *   - Salt = KOISHIKISHIKAWAIIKAWAIIKISSKISSLOVELY
 *   - 迭代次数 114514
 *   - 派生长度 256 bit
 *   - 签名算法 HS256
 *   - JWT 载荷字段 casID / name / exp
 * 我们只做验签解析，不签发。JWT 有效期 60 秒，由 jjwt 依据 exp 自动校验。
 */
public class CasJwtUtil {

    private static final String CLAIM_KEY_CAS_ID = "casID";
    private static final String CLAIM_KEY_NAME = "name";

    // —— 必须与官方文档一致 ——
    private static final byte[] SALT =
            "KOISHIKISHIKAWAIIKAWAIIKISSKISSLOVELY".getBytes(StandardCharsets.UTF_8);
    private static final int ITERATION_COUNT = 114514;

    // 同一把密钥派生结果缓存，避免每次验签都重复做一次昂贵的 PBKDF2（114514 次迭代）
    private static final Map<String, SecretKey> KEY_CACHE = new ConcurrentHashMap<>();

    private static SecretKey deriveKey(String jwtSecret) {
        return KEY_CACHE.computeIfAbsent(jwtSecret, k -> {
            try {
                PBEKeySpec spec = new PBEKeySpec(k.toCharArray(), SALT, ITERATION_COUNT, 256);
                SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
                byte[] secretBytes = factory.generateSecret(spec).getEncoded();
                return new SecretKeySpec(secretBytes, "HmacSHA256");
            } catch (Exception e) {
                throw new RuntimeException("派生 CAS 签名密钥失败", e);
            }
        });
    }

    /**
     * 验签并解析。成功返回 [casID, name]；失败（过期/篡改/密钥不符）返回 null。
     * @param token     官方 /auth/token 换回的 JWT
     * @param jwtSecret 控制台的 JWT 密钥
     */
    public static String[] parse(String token, String jwtSecret) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(deriveKey(jwtSecret))
                    .build()
                    .parseSignedClaims(token)   // 同时校验签名与 exp
                    .getPayload();
            String casId = claims.get(CLAIM_KEY_CAS_ID, String.class);
            String name = claims.get(CLAIM_KEY_NAME, String.class);
            return new String[]{casId, name};
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
