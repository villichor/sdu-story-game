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
 * 专门用来解析【统一认证代理】重定向过来的 token。
 *
 * ⚠️ 下列常量必须与学长模板 JwtUtil 完全一致，否则验签失败解不开：
 *   - 算法 HS256
 *   - salt、iterationCount
 *   - claim 字段名 casID / name
 * 我们只需要解析（getClaim），不需要生成。
 */
public class CasJwtUtil {

    private static final String CLAIM_KEY_CAS_ID = "casID";
    private static final String CLAIM_KEY_NAME = "name";

    // —— 必须与学长模板一致 ——
    private static final byte[] SALT =
            "KOISHIKISHIKAWAIIKAWAIIKISSKISSLOVELY".getBytes(StandardCharsets.UTF_8);
    private static final int ITERATION_COUNT = 114514;

    private static final Map<String, SecretKey> KEY_CACHE = new ConcurrentHashMap<>();

    private static SecretKey generateSecretKey(String key) {
        return KEY_CACHE.computeIfAbsent(key, k -> {
            try {
                PBEKeySpec spec = new PBEKeySpec(k.toCharArray(), SALT, ITERATION_COUNT, 256);
                SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
                byte[] secretBytes = factory.generateSecret(spec).getEncoded();
                return new SecretKeySpec(secretBytes, "HmacSHA256");
            } catch (Exception e) {
                throw new RuntimeException("生成 CAS 密钥失败", e);
            }
        });
    }

    /**
     * 解析 token。成功返回 [casID, name]；失败（过期/篡改/密钥不符）返回 null。
     */
    public static String[] parse(String token, String key) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(generateSecretKey(key))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String casId = claims.get(CLAIM_KEY_CAS_ID, String.class);
            String name = claims.get(CLAIM_KEY_NAME, String.class);
            return new String[]{casId, name};
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
