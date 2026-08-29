package edu.sdu.storygame.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import edu.sdu.storygame.data.po.SavePath;
import edu.sdu.storygame.data.vo.StoryPathNodeVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface SavePathMapper extends BaseMapper<SavePath> {

    /**
     * 查询存档当前有效且需要展示的剧情路径节点
     *
     * @param saveId        存档 ID
     * @param currentPathId 当前有效路径记录 ID
     * @return 按步骤排列的路径节点
     */
    List<StoryPathNodeVO> selectStoryPathNodes(
            @Param("saveId") Long saveId,
            @Param("currentPathId") Long currentPathId
    );
}
