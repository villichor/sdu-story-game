package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.StoryChoice;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StoryChoiceMapper extends BaseMapper<StoryChoice> {
}
