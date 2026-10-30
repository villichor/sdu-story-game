package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.StoryNode;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface StoryNodeMapper extends BaseMapper<StoryNode> {
}
