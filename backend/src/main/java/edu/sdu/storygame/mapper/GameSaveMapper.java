package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.GameSave;
import edu.sdu.storygame.data.vo.GameSaveVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface GameSaveMapper extends BaseMapper<GameSave> {

    /**
     * 查询当前用户存档列表
     */
    List<GameSaveVO> selectSaveList(
            @Param("userId") Long userId,
            @Param("chapterId") Long chapterId
    );
}
