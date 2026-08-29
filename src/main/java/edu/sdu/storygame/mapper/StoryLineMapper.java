package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.StoryLine;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface StoryLineMapper extends BaseMapper<StoryLine> {

    List<StoryLine> selectVisibleLines(@Param("saveId") Long saveId,@Param("nodeId") Long nodeId);
}
