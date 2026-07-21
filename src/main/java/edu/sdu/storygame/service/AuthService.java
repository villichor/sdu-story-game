package edu.sdu.storygame.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import edu.sdu.storygame.entity.User;
import edu.sdu.storygame.mapper.UserMapper;
import edu.sdu.storygame.util.AppJwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final AppJwtUtil appJwtUtil;

    /**
     * 游客登录：直接建一个游客用户并签发登录态。
     * @return 我们自己系统的 JWT
     */
    public String guestLogin() {
        User user = new User();
        user.setIsGuest(true);
        user.setUsername("游客" + System.currentTimeMillis() % 100000);
        user.setProgressRate(0);
        user.setUnlockedStoryCount(0);
        user.setAchievementCount(0);
        userMapper.insert(user);   // 插入后 user.id 自动回填
        return appJwtUtil.generate(user.getId());
    }

    /**
     * 统一认证登录：拿到学号后查/建用户，签发登录态。
     * @param casId 学号
     * @param name  姓名
     * @return 我们自己系统的 JWT
     */
    public String casLogin(String casId, String name) {
        // 用学号查是否已有账号
        User user = userMapper.selectOne(
                Wrappers.<User>lambdaQuery().eq(User::getStudentId, casId));

        if (user == null) {
            // 新用户：建正式账号
            user = new User();
            user.setIsGuest(false);
            user.setStudentId(casId);
            user.setUsername(name != null ? name : casId);
            user.setProgressRate(0);
            user.setUnlockedStoryCount(0);
            user.setAchievementCount(0);
            userMapper.insert(user);
        }
        return appJwtUtil.generate(user.getId());
    }
}
