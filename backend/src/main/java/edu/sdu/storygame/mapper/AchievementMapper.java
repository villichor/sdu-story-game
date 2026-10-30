package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.Achievement;
import edu.sdu.storygame.data.vo.AchievementVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 成就定义数据访问层
 */
@Mapper
public interface AchievementMapper
        extends BaseMapper<Achievement> {

    /**
     * 查询当前用户的成就列表
     * @param userId    当前用户 ID
     * @param chapterId 可选章节 ID
     * @return 成就列表
     */
    List<AchievementVO> selectAchievementList(
            @Param("userId") Long userId,
            @Param("chapterId") Long chapterId
    );
}