package edu.sdu.storygame.controller;


import edu.sdu.storygame.context.UserContext;
import edu.sdu.storygame.data.enums.ResultCode;
import edu.sdu.storygame.data.po.User;
import edu.sdu.storygame.data.vo.Result;
import edu.sdu.storygame.exception.BusinessException;
import edu.sdu.storygame.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserMapper userMapper;

    /**
     * 个人信息
     * @return user实体
     */
    @GetMapping("/me")
    public Result<User> me() {
        Long userId = UserContext.getUserId();
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.USER_NOT_FOUND);
        }
        return Result.success(user);
    }
}
