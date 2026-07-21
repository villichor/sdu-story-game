package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * 继承 BaseMapper 后，单表增删改查（insert/selectById/updateById 等）自动具备，无需写 SQL。
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
